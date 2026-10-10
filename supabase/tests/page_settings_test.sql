-- Run after all migrations + seed.sql. Any failure stops the script with a red error.
-- Uses made-up user ids and rolls everything back, so no test data remains.
begin;

-- setup (as the database owner): an owner and a manager of the demo provider
insert into provider_members (provider_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('00000000-0000-0000-0000-0000000000a1', '55555555-5555-5555-5555-555555555555', 'manager');

do $$
declare
  pid uuid := '00000000-0000-0000-0000-0000000000a1';
  v_before int;
  v_after  int;
begin
  -- 1. changing the terms creates a new version and keeps the history
  select terms_version into v_before from providers where id = pid;
  update providers set terms_text = 'Test terms, version A' where id = pid;
  select terms_version into v_after from providers where id = pid;
  assert v_after = v_before + 1, 'editing terms should bump the version';
  assert (select terms_text from provider_terms where provider_id = pid and version = v_after) = 'Test terms, version A',
         'the new terms should be saved in the history';
  assert exists (select 1 from provider_terms where provider_id = pid and version = v_before),
         'the previous version must still be in the history';

  -- 2. other edits don't change the version, and the version can't be set by hand
  update providers set display_name = 'Renamed Test' where id = pid;
  assert (select terms_version from providers where id = pid) = v_after, 'a rename must not bump the version';
  update providers set terms_version = 999 where id = pid;
  assert (select terms_version from providers where id = pid) = v_after, 'the version must not be settable by hand';

  -- 3. signed-in users can change settings columns, but not Stripe or version fields
  assert has_column_privilege('authenticated', 'providers', 'terms_text', 'UPDATE'), 'owners should be able to edit terms';
  assert has_column_privilege('authenticated', 'providers', 'brand_color', 'UPDATE'), 'owners should be able to edit colours';
  assert not has_column_privilege('authenticated', 'providers', 'stripe_account_id', 'UPDATE'), 'stripe_account_id must be server-only';
  assert not has_column_privilege('authenticated', 'providers', 'stripe_charges_enabled', 'UPDATE'), 'stripe_charges_enabled must be server-only';
  assert not has_column_privilege('authenticated', 'providers', 'terms_version', 'UPDATE'), 'terms_version must be server-only';
  assert not has_table_privilege('authenticated', 'providers', 'INSERT'), 'only the server creates providers';
  -- terms history has a read policy only, so signed-in users can never add, edit or delete it
  assert not exists (select 1 from pg_policies
                      where tablename = 'provider_terms' and permissive = 'PERMISSIVE' and cmd <> 'SELECT'),
         'nobody but the triggers may write terms history';
end;
$$;

-- from here on, act like the app's signed-in users do
set local role authenticated;

-- 4. a verified MANAGER cannot change business settings (owner only)
select set_config('request.jwt.claims',
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated","aal":"aal2"}', true);
do $$
declare n int;
begin
  update providers set display_name = 'Manager was here' where id = '00000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  assert n = 0, 'a manager must not be able to change business settings';
end $$;

-- 5. the verified OWNER can, and can read the terms history
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
do $$
declare n int;
begin
  update providers set display_name = 'Owner rename' where id = '00000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  assert n = 1, 'the owner should be able to change business settings';
  assert (select count(*) from provider_terms) >= 2, 'the owner should see their terms history';
end $$;

-- 6. the owner with password only (no two-step) can't change anything
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', true);
do $$
declare n int;
begin
  update providers set display_name = 'No two-step' where id = '00000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  assert n = 0, 'a password-only session must not change settings';
end $$;

reset role;
rollback;   -- leave no test data behind

-- Only reached if every check above passed.
select 'ALL PAGE SETTINGS TESTS PASSED' as result;
