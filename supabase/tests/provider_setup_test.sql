-- Run after all migrations + seed.sql. Any failure stops the script with a red error.
-- Uses made-up user ids and rolls everything back, so no test data remains.
begin;

do $$
declare
  v providers;
  -- random web address, so the test never collides with a real business
  test_slug text := 'zz-test-' || substr(md5(random()::text), 1, 10);
begin
  -- 1. creating a business makes the user its owner and logs it
  v := create_provider('33333333-3333-3333-3333-333333333333', upper(test_slug), '  Test Studio  ', 'America/Chicago');
  assert v.slug = test_slug, 'slug should be lowercased, got ' || v.slug;
  assert v.display_name = 'Test Studio', 'name should be trimmed';
  assert v.timezone = 'America/Chicago', 'timezone should be saved';
  assert v.page_access = 'private', 'new purchase pages must start private';
  assert (select role from provider_members
           where provider_id = v.id and user_id = '33333333-3333-3333-3333-333333333333') = 'owner',
         'creator should be the owner';
  assert exists (select 1 from audit_log where action = 'provider.created' and entity_id = v.id::text),
         'creation should be in the audit log';

  -- 2. web addresses are unique
  begin
    perform create_provider('44444444-4444-4444-4444-444444444444', test_slug, 'Someone Else');
    raise exception 'a duplicate web address should have failed';
  exception when unique_violation then null;
  end;

  -- 3. badly formed web addresses are refused by the database
  begin
    perform create_provider('44444444-4444-4444-4444-444444444444', 'bad address!', 'Someone Else');
    raise exception 'a bad web address should have failed';
  exception when check_violation then null;
  end;

  -- 4. a blank business name is refused
  begin
    perform create_provider('44444444-4444-4444-4444-444444444444', test_slug || '-2', '   ');
    raise exception 'a blank name should have failed';
  exception when raise_exception then
    assert sqlerrm like '%business name%', 'unexpected error: ' || sqlerrm;
  end;

  -- 5. browsers (anon / signed-in) cannot call business functions directly; the server can
  assert not has_function_privilege('anon', 'record_visit(text, uuid, uuid, boolean)', 'execute'),
         'browsers must not call record_visit';
  assert not has_function_privilege('authenticated', 'record_visit(text, uuid, uuid, boolean)', 'execute'),
         'signed-in users must not call record_visit directly';
  assert not has_function_privilege('authenticated', 'mark_purchase_paid(uuid, text)', 'execute'),
         'signed-in users must not call mark_purchase_paid';
  assert not has_function_privilege('authenticated', 'create_provider(uuid, text, text, text)', 'execute'),
         'signed-in users must not call create_provider directly';
  assert has_function_privilege('service_role', 'record_visit(text, uuid, uuid, boolean)', 'execute'),
         'the server must still be able to call record_visit';
  assert has_function_privilege('service_role', 'create_provider(uuid, text, text, text)', 'execute'),
         'the server must be able to call create_provider';
end;
$$;

rollback;   -- leave no test data behind

-- Only reached if every check above passed.
select 'ALL PROVIDER SETUP TESTS PASSED' as result;
