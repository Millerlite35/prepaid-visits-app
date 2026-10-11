-- Run after all migrations + seed.sql. Any failure stops the script with a red error.
-- Rolls everything back, so no test data remains.
begin;

-- setup (as the database owner): a fake owner, and a paid client of the demo provider
insert into provider_members (provider_id, user_id, role)
values ('00000000-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'owner');

create temporary table t on commit drop as
select * from complete_checkout('00000000-0000-0000-0000-0000000000a1',
  'cs_test_' || substr(md5(random()::text), 1, 12), 'pi_t', 'Casey Test', 'casey@example.com',
  null, 'Standard', 6, 45000, 'usd', 365, 1, now());
grant select on t to anon, authenticated;

-- 1. lost pass: reissue cancels the old pass and the new one works
do $$
declare
  pid uuid := '00000000-0000-0000-0000-0000000000a1';
  acct uuid;
  old_cred uuid;
  old_tok text;
  new_cred uuid;
  new_tok text;
  r record;
begin
  select visit_account_id, credential_id into acct, old_cred from t;
  select token into old_tok from credentials where id = old_cred;

  new_cred := reissue_wallet_pass(pid, acct, '11111111-1111-1111-1111-111111111111');
  select token into new_tok from credentials where id = new_cred;
  assert new_cred <> old_cred and new_tok <> old_tok, 'a new pass with a new code should be issued';
  assert (select status from credentials where id = old_cred) = 'revoked', 'the old pass must be cancelled';
  assert (select count(*) from credentials where visit_account_id = acct and kind = 'wallet' and status = 'active') = 1,
         'exactly one active pass';

  select * into r from record_visit(old_tok, pid);
  assert r.result = 'revoked', 'the old code must be refused, got ' || r.result;
  select * into r from record_visit(new_tok, pid);
  assert r.result = 'ok' and r.remaining = 5, 'the new code should work and keep the balance';

  begin
    perform reissue_wallet_pass(gen_random_uuid(), acct, null);
    raise exception 'reissuing for another provider should fail';
  exception when raise_exception then
    assert sqlerrm like '%does not belong%', 'unexpected: ' || sqlerrm;
  end;

  assert not has_function_privilege('authenticated', 'reissue_wallet_pass(uuid, uuid, uuid)', 'execute'),
         'only the server may reissue passes';
end;
$$;

-- 2. SECURITY: the balance views must obey row-level security
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare n int;
begin
  begin
    select count(*) into n from account_balances;
  exception when insufficient_privilege then n := 0;
  end;
  assert n = 0, 'a stranger must not see any balances (account_balances)';
  begin
    select count(*) into n from purchase_balances;
  exception when insufficient_privilege then n := 0;
  end;
  assert n = 0, 'a stranger must not see any balances (purchase_balances)';
end $$;

set local role authenticated;
-- a verified user who is not a member sees nothing
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
do $$ begin
  assert (select count(*) from account_balances) = 0, 'a non-member must not see balances';
  assert (select count(*) from purchase_balances) = 0, 'a non-member must not see package balances';
end $$;

-- the verified owner sees their own client's balance
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
do $$ begin
  assert (select usable_visits from account_balances where visit_account_id = (select visit_account_id from t)) = 5,
         'the owner should see their client''s balance';
end $$;

-- the same owner without two-step sees nothing
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', true);
do $$ begin
  assert (select count(*) from account_balances) = 0, 'a password-only session must not see balances';
end $$;

reset role;
rollback;   -- leave no test data behind

-- Only reached if every check above passed.
select 'ALL CLIENTS TESTS PASSED' as result;
