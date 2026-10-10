-- Run after all migrations + seed.sql. Any failure stops the script with a red error.
-- Rolls everything back, so no test data remains.
begin;

do $$
declare
  pid  uuid := '00000000-0000-0000-0000-0000000000a1';
  sess text := 'cs_test_' || substr(md5(random()::text), 1, 12);
  sess2 text := 'cs_test_' || substr(md5(random()::text), 1, 12);
  r    record;
  r2   record;
  r3   record;
  bal  int;
  tok  text;
begin
  -- 1. a paid checkout creates the client, account, purchase, visits and a wallet pass
  select * into r from complete_checkout(pid, sess, 'pi_test_1', ' Jamie Test ', ' Jamie@Example.com ',
    null, 'Standard', 6, 45000, 'usd', 365, 1, now());
  assert r.is_new, 'first call should create the purchase';
  assert (select full_name from clients c join visit_accounts a on a.client_id = c.id where a.id = r.visit_account_id) = 'Jamie Test',
         'name should be trimmed';
  assert (select email from clients c join visit_accounts a on a.client_id = c.id where a.id = r.visit_account_id) = 'jamie@example.com',
         'email should be stored lowercase';
  assert (select status from purchases where id = r.purchase_id) = 'paid', 'purchase should be paid';
  assert (select expires_at is not null from purchases where id = r.purchase_id), 'expiry date should be set';
  select usable_visits into bal from account_balances where visit_account_id = r.visit_account_id;
  assert bal = 6, 'expected 6 visits, got ' || bal;
  select token into tok from credentials where id = r.credential_id;
  assert tok ~ '^[0-9a-f]{64}$', 'the pass must hold only a random token';
  assert (select kind from credentials where id = r.credential_id) = 'wallet';

  -- 2. Stripe retrying the same webhook does not grant visits twice
  select * into r2 from complete_checkout(pid, sess, 'pi_test_1', 'Jamie Test', 'jamie@example.com',
    null, 'Standard', 6, 45000, 'usd', 365, 1, now());
  assert not r2.is_new, 'a repeat call must not create a second purchase';
  assert r2.purchase_id = r.purchase_id and r2.credential_id = r.credential_id, 'a repeat call returns the same purchase and pass';
  select usable_visits into bal from account_balances where visit_account_id = r.visit_account_id;
  assert bal = 6, 'a repeat call must not add visits, got ' || bal;

  -- 3. buying again with the same email (any case) tops up the same account and pass
  select * into r3 from complete_checkout(pid, sess2, 'pi_test_2', 'Jamie T', 'JAMIE@example.com',
    null, 'Starter', 3, 24000, 'usd', null, 1, now());
  assert r3.is_new and r3.visit_account_id = r.visit_account_id, 'a second purchase should top up the same account';
  assert r3.credential_id = r.credential_id, 'the client should keep the same pass';
  select usable_visits into bal from account_balances where visit_account_id = r.visit_account_id;
  assert bal = 9, 'expected 6 + 3 = 9 visits, got ' || bal;
  assert (select full_name from clients c join visit_accounts a on a.client_id = c.id where a.id = r.visit_account_id) = 'Jamie Test',
         'a later purchase must not rename the existing client';

  -- 4. missing name or bad email is refused
  begin
    perform complete_checkout(pid, sess || 'x', 'pi', '  ', 'a@b.co', null, 'S', 1, 100, 'usd', null, 1, now());
    raise exception 'a blank name should have failed';
  exception when raise_exception then
    assert sqlerrm like '%valid name or email%', 'unexpected: ' || sqlerrm;
  end;
  begin
    perform complete_checkout(pid, sess || 'y', 'pi', 'Name', 'not-an-email', null, 'S', 1, 100, 'usd', null, 1, now());
    raise exception 'a bad email should have failed';
  exception when raise_exception then
    assert sqlerrm like '%valid name or email%', 'unexpected: ' || sqlerrm;
  end;

  -- 5. only the server may call it
  assert not has_function_privilege('anon',
    'complete_checkout(uuid, text, text, text, text, uuid, text, integer, integer, text, integer, integer, timestamptz)', 'execute'),
    'browsers must not call complete_checkout';
  assert not has_function_privilege('authenticated',
    'complete_checkout(uuid, text, text, text, text, uuid, text, integer, integer, text, integer, integer, timestamptz)', 'execute'),
    'signed-in users must not call complete_checkout';
end;
$$;

rollback;   -- leave no test data behind

-- Only reached if every check above passed.
select 'ALL CHECKOUT TESTS PASSED' as result;
