-- Run after 0019. Any failure stops the script with a red error. Read-only.

do $$
begin
  assert has_table_privilege('service_role', 'public.session_trust', 'select'), 'server must read session_trust';
  assert has_table_privilege('service_role', 'public.session_trust', 'insert'), 'server must write session_trust';
  assert not has_table_privilege('anon', 'public.session_trust', 'select'), 'anon must not read session_trust';
  assert not has_table_privilege('authenticated', 'public.session_trust', 'select'), 'staff must not read session_trust';
  assert not has_table_privilege('authenticated', 'public.session_trust', 'insert'), 'staff must not write session_trust';
  assert (select relrowsecurity from pg_class where oid = 'public.session_trust'::regclass), 'RLS must be on';
end $$;

select 'ALL SESSION TRUST TESTS PASSED' as result;
