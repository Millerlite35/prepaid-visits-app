-- Run after all migrations + seed.sql. Any failure stops the script with a red error.
-- Rolls everything back, so no test data remains. (No Stripe calls: this tests the
-- database side; the app calls Stripe between begin_refund and finish/fail_refund.)
begin;

do $$
declare
  pid  uuid := '00000000-0000-0000-0000-0000000000a1';
  owner uuid := '11111111-1111-1111-1111-111111111111';
  r    record;
  acct uuid;
  pur  uuid;
  tok  text;
  ref1 uuid;
  ref2 uuid;
  ref3 uuid;
  bal  int;
  v    record;
begin
  -- setup: a paid 6-visit, $450 package, then one check-in (5 left)
  select * into r from complete_checkout(pid, 'cs_test_' || substr(md5(random()::text), 1, 12), 'pi_test_ref',
    'Riley Test', 'riley@example.com', null, 'Standard', 6, 45000, 'usd', 365, 1, now());
  acct := r.visit_account_id;
  pur := r.purchase_id;
  select token into tok from credentials where id = r.credential_id;
  select * into v from record_visit(tok, pid);
  assert v.result = 'ok' and v.remaining = 5, 'setup check-in failed';

  -- 1. partial refund: 2 visits, $150. Visits leave immediately; money is "pending"
  ref1 := begin_refund(pid, pur, 2, 15000, 'Moving away', 'req-1', owner);
  select usable_visits into bal from account_balances where visit_account_id = acct;
  assert bal = 3, 'reserving 2 visits should leave 3, got ' || bal;
  assert (select status from refunds where id = ref1) = 'pending';

  -- a double click (same request id) is the same refund, not a second one
  assert begin_refund(pid, pur, 2, 15000, 'Moving away', 'req-1', owner) = ref1, 'same request must return the same refund';
  select usable_visits into bal from account_balances where visit_account_id = acct;
  assert bal = 3, 'a repeated request must not remove more visits';

  perform finish_refund(ref1, 're_test_1');
  perform finish_refund(ref1, 're_test_1');   -- safe to repeat
  assert (select status from refunds where id = ref1) = 'succeeded';
  assert (select status from purchases where id = pur) = 'partially_refunded';

  -- 2. limits: can't refund more visits than are left, or more money than was paid
  begin
    perform begin_refund(pid, pur, 4, 100, null, 'req-too-many', owner);
    raise exception 'refunding too many visits should fail';
  exception when raise_exception then
    assert sqlerrm like '%unused visit%', 'unexpected: ' || sqlerrm;
  end;
  begin
    perform begin_refund(pid, pur, 0, 30001, null, 'req-too-much', owner);
    raise exception 'refunding too much money should fail';
  exception when raise_exception then
    assert sqlerrm like '%left to refund%', 'unexpected: ' || sqlerrm;
  end;

  -- 3. Stripe refuses: the reserved visit comes back, and failing twice is harmless
  ref2 := begin_refund(pid, pur, 1, 7500, null, 'req-2', owner);
  select usable_visits into bal from account_balances where visit_account_id = acct;
  assert bal = 2, 'reserving 1 more should leave 2, got ' || bal;
  perform fail_refund(ref2, 'card_declined');
  perform fail_refund(ref2, 'card_declined');
  select usable_visits into bal from account_balances where visit_account_id = acct;
  assert bal = 3, 'a failed refund must restore the visit, got ' || bal;
  assert (select status from refunds where id = ref2) = 'failed';
  -- a failed refund's money doesn't count, so $300 is still refundable
  ref3 := begin_refund(pid, pur, 3, 30000, null, 'req-3', owner);
  perform finish_refund(ref3, 're_test_3');
  assert (select status from purchases where id = pur) = 'refunded', 'fully refunded with no visits left';
  select usable_visits into bal from account_balances where visit_account_id = acct;
  assert bal = 0, 'nothing should be left, got ' || bal;

  -- 4. adjustments: adding with no usable package creates a Complimentary entry
  assert adjust_visits(pid, acct, 2, 'Make-up for cancelled class', owner) = 2, 'adding 2 should give 2';
  assert exists (select 1 from purchases where visit_account_id = acct and package_name = 'Complimentary' and price_cents = 0),
         'a complimentary entry should exist';
  assert adjust_visits(pid, acct, -1, 'No-show', owner) = 1, 'removing 1 should leave 1';
  begin
    perform adjust_visits(pid, acct, -5, 'Too many', owner);
    raise exception 'removing more than available should fail';
  exception when raise_exception then
    assert sqlerrm like '%available to remove%', 'unexpected: ' || sqlerrm;
  end;
  begin
    perform adjust_visits(pid, acct, 1, '   ', owner);
    raise exception 'a blank note should fail';
  exception when raise_exception then
    assert sqlerrm like '%note%', 'unexpected: ' || sqlerrm;
  end;
  begin
    perform adjust_visits(gen_random_uuid(), acct, 1, 'wrong provider', owner);
    raise exception 'another provider should fail';
  exception when raise_exception then
    assert sqlerrm like '%does not belong%', 'unexpected: ' || sqlerrm;
  end;

  -- 5. every change is in the ledger (hard rule 3): grant 6, -1, -2, -1, +1, -3, +2, -1 = 1
  assert (select sum(delta) from visit_ledger where visit_account_id = acct) = 1, 'ledger must add up to the balance';

  -- 6. only the server may call these
  assert not has_function_privilege('authenticated', 'begin_refund(uuid, uuid, integer, integer, text, text, uuid)', 'execute');
  assert not has_function_privilege('authenticated', 'adjust_visits(uuid, uuid, integer, text, uuid)', 'execute');
  assert not has_function_privilege('anon', 'finish_refund(uuid, text)', 'execute');
end;
$$;

-- 7. strangers can't read refunds
set local role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from refunds;
  exception when insufficient_privilege then n := 0;
  end;
  assert n = 0, 'a stranger must not see refunds';
end $$;

reset role;
rollback;   -- leave no test data behind

select 'ALL REFUND TESTS PASSED' as result;
