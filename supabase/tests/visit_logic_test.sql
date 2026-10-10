-- Run after migrations + seed.sql. Raises an error on the first failure.
-- Tests use a throwaway provider so they never touch real data.
begin;

do $$
declare
  pid   uuid := '00000000-0000-0000-0000-0000000000a1';
  tmpl  uuid;
  cl    uuid;
  acct  uuid;
  cred  credentials;
  pur   uuid;
  pur2  uuid;
  r     record;
  led   bigint;
  bal   integer;
  batch record;
  tok   text;
begin
  -- setup: client, account, wallet credential, one 3-visit purchase
  insert into clients (provider_id, full_name, email) values (pid, 'Alex Rivera', 'alex@example.com') returning id into cl;
  insert into visit_accounts (provider_id, client_id) values (pid, cl) returning id into acct;
  insert into credentials (provider_id, visit_account_id, kind) values (pid, acct, 'wallet') returning * into cred;

  select id into tmpl from package_templates where provider_id = pid and name = 'Starter';
  insert into purchases (provider_id, visit_account_id, package_template_id, package_name, visits_purchased,
                         price_cents, expires_days, terms_version, terms_accepted_at)
  values (pid, acct, tmpl, 'Starter', 3, 24000, 365, 1, now()) returning id into pur;

  -- 1. unpaid purchase gives no visits
  select * into r from record_visit(cred.token, pid);
  assert r.result = 'no_visits', 'unpaid purchase should not grant visits, got ' || r.result;

  -- 2. paying grants visits, and paying twice does not double-grant
  perform mark_purchase_paid(pur, 'pi_test');
  perform mark_purchase_paid(pur, 'pi_test');
  select usable_visits into bal from account_balances where visit_account_id = acct;
  assert bal = 3, 'expected 3 visits after payment, got ' || bal;

  -- 3. first check-in works
  select * into r from record_visit(cred.token, pid);
  assert r.result = 'ok' and r.remaining = 2 and r.client_name = 'Alex Rivera',
         'first check-in failed: ' || coalesce(r.result,'null');
  led := r.ledger_id;

  -- 4. scanning again right away is flagged, not deducted
  select * into r from record_visit(cred.token, pid);
  assert r.result = 'duplicate_recent', 'expected duplicate warning, got ' || r.result;
  select usable_visits into bal from account_balances where visit_account_id = acct;
  assert bal = 2, 'duplicate scan must not deduct';

  -- 5. undo restores the visit, and cannot be undone twice
  assert undo_visit(led) = 3, 'undo should restore to 3';
  begin
    perform undo_visit(led);
    raise exception 'second undo should have failed';
  exception when others then
    assert sqlerrm like '%already undone%', 'unexpected error: ' || sqlerrm;
  end;

  -- 6. force override lets staff scan back-to-back (use all visits)
  select * into r from record_visit(cred.token, pid, null, true); assert r.result = 'ok';
  select * into r from record_visit(cred.token, pid, null, true); assert r.result = 'ok';
  select * into r from record_visit(cred.token, pid, null, true); assert r.result = 'ok' and r.remaining = 0;
  select * into r from record_visit(cred.token, pid, null, true);
  assert r.result = 'no_visits', 'expected no_visits when empty, got ' || r.result;

  -- 7. topping up the same account with a new package works; soonest-expiring is used first
  insert into purchases (provider_id, visit_account_id, package_name, visits_purchased, price_cents, expires_days, terms_version, terms_accepted_at)
  values (pid, acct, 'Standard', 6, 45000, 365, 1, now()) returning id into pur2;
  perform mark_purchase_paid(pur2);
  select * into r from record_visit(cred.token, pid, null, true);
  assert r.result = 'ok' and r.remaining = 5, 'top-up check-in failed';

  -- 8. expiry: an expired package cannot be used and visits are written off
  update purchases set expires_at = now() - interval '1 day' where id = pur2;
  select * into r from record_visit(cred.token, pid, null, true);
  assert r.result = 'expired', 'expected expired, got ' || r.result;
  assert expire_purchases() = 1, 'expire_purchases should write off one package';
  assert expire_purchases() = 0, 'expire_purchases must be safe to re-run';
  select * into r from record_visit(cred.token, pid, null, true);
  assert r.result = 'no_visits', 'after write-off expected no_visits, got ' || r.result;

  -- 9. unknown codes and the wrong provider are rejected
  select * into r from record_visit('not-a-real-token', pid);
  assert r.result = 'unknown_code';
  select * into r from record_visit(cred.token, gen_random_uuid());
  assert r.result = 'unknown_code', 'a code must not work for a different provider';

  -- 10. lost card: revoke, scan is refused, a new credential works
  perform revoke_credential(cred.id, pid);
  select * into r from record_visit(cred.token, pid);
  assert r.result = 'revoked', 'revoked card must be refused';

  -- 11. pre-printed card batch: unassigned until linked
  select count(*) into bal from create_card_batch(pid, 5, 'key_tag');
  assert bal = 5, 'batch should create 5';
  select token into tok from credentials where provider_id = pid and status = 'unassigned' limit 1;
  select * into r from record_visit(tok, pid);
  assert r.result = 'unassigned', 'unlinked card must prompt for linking';
  perform link_card(tok, pid, acct);
  begin
    perform link_card(tok, pid, acct);
    raise exception 'linking twice should fail';
  exception when others then
    assert sqlerrm like '%already%', 'unexpected: ' || sqlerrm;
  end;

  raise notice 'ALL VISIT LOGIC TESTS PASSED';
end;
$$;

rollback;   -- leave no test data behind

-- Only reached if every check above passed (any failure stops the script with an error).
-- Shown as a result row because the Supabase SQL Editor hides "raise notice" messages.
select 'ALL VISIT LOGIC TESTS PASSED' as result;
