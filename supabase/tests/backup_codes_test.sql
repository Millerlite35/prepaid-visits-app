-- Run after all migrations. Any failure stops the script with a red error.
-- Rolls everything back, so no test data remains (including the fake user).
begin;

insert into auth.users (id, email, aud, role)
values ('55555555-5555-5555-5555-555555555555', 'backup-codes-test@example.com', 'authenticated', 'authenticated');

do $$
declare
  u uuid := '55555555-5555-5555-5555-555555555555';
  hashes text[] := array(select encode(sha256(('code' || g)::bytea), 'hex') from generate_series(1, 10) g);
  first_hash text := encode(sha256('code1'::bytea), 'hex');
begin
  perform replace_backup_codes(u, hashes);
  assert (select count(*) from mfa_backup_codes where user_id = u and used_at is null) = 10, 'should have 10 codes';

  -- a code works once
  assert use_backup_code(u, first_hash), 'a valid code should work';
  assert not use_backup_code(u, first_hash), 'a used code must not work again';
  assert not use_backup_code(u, encode(sha256('wrong'::bytea), 'hex')), 'a wrong code must not work';
  assert (select count(*) from mfa_backup_codes where user_id = u and used_at is null) = 9, 'should have 9 left';

  -- someone else's code doesn't work for you
  assert not use_backup_code(gen_random_uuid(), encode(sha256('code2'::bytea), 'hex')), 'codes belong to one person';

  -- new codes replace all old ones
  perform replace_backup_codes(u, array(select encode(sha256(('new' || g)::bytea), 'hex') from generate_series(1, 10) g));
  assert not use_backup_code(u, encode(sha256('code2'::bytea), 'hex')), 'old codes must stop working';
  assert use_backup_code(u, encode(sha256('new3'::bytea), 'hex')), 'new codes should work';

  -- uses and failures are recorded
  assert (select count(*) from audit_log where actor_id = u and action = 'backup_code.used') = 2;
  assert (select count(*) from audit_log where actor_id = u and action = 'backup_code.rejected') >= 3;

  -- only the server may use these
  assert not has_function_privilege('anon', 'use_backup_code(uuid, text)', 'execute');
  assert not has_function_privilege('authenticated', 'use_backup_code(uuid, text)', 'execute');
  assert not has_function_privilege('authenticated', 'replace_backup_codes(uuid, text[])', 'execute');
  assert has_function_privilege('service_role', 'use_backup_code(uuid, text)', 'execute');
end $$;

set local role authenticated;
do $$
declare n int;
begin
  begin
    select count(*) into n from mfa_backup_codes;
  exception when insufficient_privilege then n := 0;
  end;
  assert n = 0, 'signed-in users must not read backup codes';
end $$;

reset role;
rollback;

select 'ALL BACKUP CODE TESTS PASSED' as result;
