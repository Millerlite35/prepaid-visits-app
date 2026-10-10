-- Run after all migrations + seed.sql. Checks row-level security from the point of
-- view of signed-in staff. Any failure stops the script with a red error.
-- Uses made-up user ids and rolls everything back, so no test data remains.
begin;

-- setup (as the database owner): a fake staff member who owns the demo provider
insert into provider_members (provider_id, user_id, role)
values ('00000000-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'owner');

-- from here on, act like the app's signed-in users do
set local role authenticated;

-- 1. owner with password only (no authenticator code yet) sees nothing
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', true);
do $$ begin
  assert (select count(*) from providers) = 0, 'password-only login must not see providers';
  assert (select count(*) from provider_members) = 0, 'password-only login must not see memberships';
  assert (select count(*) from package_templates) = 0, 'password-only login must not see packages';
end $$;

-- 2. the same owner after entering their code sees their business
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
do $$ begin
  assert (select count(*) from providers) = 1, 'verified owner should see exactly their provider';
  assert (select count(*) from provider_members) = 1, 'verified owner should see their membership';
  assert (select count(*) from package_templates) > 0, 'verified owner should see their packages';
end $$;

-- 3. a different verified user who is not a member sees nothing
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
do $$ begin
  assert (select count(*) from providers) = 0, 'a stranger must not see the provider';
  assert (select count(*) from package_templates) = 0, 'a stranger must not see packages';
end $$;

reset role;
rollback;   -- leave no test data behind

-- Only reached if every check above passed.
select 'ALL ACCESS RULE TESTS PASSED' as result;
