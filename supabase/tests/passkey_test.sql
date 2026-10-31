-- Run after all migrations (0020 included) + seed.sql. Checks that a passkey sign-in counts
-- as two-step, and that nothing else got looser. Any failure stops the script with a red error.
-- Uses made-up user ids and rolls everything back, so no test data remains.
begin;

-- setup (as the database owner): a fake staff member who owns the demo provider
insert into provider_members (provider_id, user_id, role)
values ('00000000-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'owner');

set local role authenticated;

-- 1. password only (aal1, amr password): still sees nothing
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1","amr":[{"method":"password","timestamp":1}]}', true);
do $$ begin
  assert not is_two_step_verified(), 'password-only must not count as two-step';
  assert (select count(*) from providers) = 0, 'password-only login must not see providers';
  assert (select count(*) from clients) = 0, 'password-only login must not see clients';
end $$;

-- 2. passkey sign-in (aal1, amr passkey): sees exactly their own business
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1","amr":[{"method":"passkey","timestamp":1}]}', true);
do $$ begin
  assert is_two_step_verified(), 'a passkey sign-in must count as two-step';
  assert (select count(*) from providers) = 1, 'passkey owner should see exactly their provider';
  assert (select count(*) from package_templates) > 0, 'passkey owner should see their packages';
end $$;

-- 3. a stranger signed in with a passkey sees nothing (membership rules still apply)
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal1","amr":[{"method":"passkey","timestamp":1}]}', true);
do $$ begin
  assert (select count(*) from providers) = 0, 'a passkey stranger must not see the provider';
  assert (select count(*) from package_templates) = 0, 'a passkey stranger must not see packages';
end $$;

-- 4. look-alike methods and odd tokens don't count
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1","amr":[{"method":"passkeyx","timestamp":1}]}', true);
do $$ begin assert not is_two_step_verified(), 'only the exact method "passkey" counts'; end $$;

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1","amr":"passkey"}', true);
do $$ begin assert not is_two_step_verified(), 'amr must be a list'; end $$;

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', true);
do $$ begin assert not is_two_step_verified(), 'no amr = not two-step'; end $$;

-- 5. the usual authenticator-code session still works
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2","amr":[{"method":"totp","timestamp":1}]}', true);
do $$ begin
  assert is_two_step_verified(), 'aal2 must still count';
  assert (select count(*) from providers) = 1, 'code-verified owner should still see their provider';
end $$;

reset role;
rollback;   -- leave no test data behind

-- Only reached if every check above passed.
select 'ALL PASSKEY TESTS PASSED' as result;
