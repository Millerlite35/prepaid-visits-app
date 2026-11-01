-- Run after all migrations (0021 included) + seed.sql. Checks delete_provider / close_provider.
-- Any failure stops the script with a red error. Rolls everything back, so no test data remains.
begin;

do $$
declare
  owner_id uuid := '11111111-1111-1111-1111-111111111111';
  other_id uuid := '22222222-2222-2222-2222-222222222222';
  empty_biz uuid;
  sold_biz uuid := '00000000-0000-0000-0000-0000000000a1';  -- the seeded demo provider
  r text;
  sold_cred uuid;
begin
  -- setup: a brand-new business with no sales, and a paid sale at the demo business
  empty_biz := (create_provider(owner_id, 'removal-test-biz', 'Removal Test')).id;
  insert into package_templates (provider_id, name, visits, price_cents) values (empty_biz, 'Five', 5, 10000);
  insert into provider_members (provider_id, user_id, role) values (sold_biz, owner_id, 'owner');
  insert into provider_members (provider_id, user_id, role) values (sold_biz, other_id, 'manager');
  perform complete_checkout(sold_biz, 'cs_test_' || substr(md5(random()::text), 1, 12), 'pi_t',
    'Casey Test', 'casey@example.com', null, 'Standard', 6, 45000, 'usd', 365, 1, now());
  select id into sold_cred from credentials where provider_id = sold_biz and status = 'active' limit 1;

  -- 1. only the owner can delete or close
  assert delete_provider(empty_biz, other_id) = 'not_owner', 'a non-member must not delete';
  assert close_provider(sold_biz, other_id) = 'not_owner', 'a manager must not close';
  assert delete_provider(gen_random_uuid(), owner_id) = 'not_found', 'unknown business';

  -- 2. a business with sales can't be deleted (records must stay)
  assert delete_provider(sold_biz, owner_id) = 'has_sales', 'a business with sales must not be deleted';
  assert exists (select 1 from providers where id = sold_biz), 'the business with sales must still exist';

  -- 3. a business with no sales is deleted, with its packages and membership; an audit row remains
  assert delete_provider(empty_biz, owner_id) = 'deleted', 'the empty business should be deleted';
  assert not exists (select 1 from providers where id = empty_biz), 'deleted business must be gone';
  assert not exists (select 1 from package_templates where provider_id = empty_biz), 'its packages must be gone';
  assert not exists (select 1 from provider_members where provider_id = empty_biz), 'its staff must be gone';
  assert exists (select 1 from audit_log where action = 'provider.deleted' and entity_id = empty_biz::text),
         'the deletion must be in the audit log';

  -- 4. closing: stamped, packages paused, passes cancelled, records kept
  assert close_provider(sold_biz, owner_id) = 'closed', 'the owner should be able to close';
  assert (select closed_at is not null from providers where id = sold_biz), 'closed_at must be set';
  assert not exists (select 1 from package_templates where provider_id = sold_biz and active), 'packages must be paused';
  assert not exists (select 1 from credentials where provider_id = sold_biz and status in ('active', 'unassigned')),
         'passes and cards must be cancelled';
  assert exists (select 1 from purchases where provider_id = sold_biz), 'purchases must be kept';
  assert exists (select 1 from visit_ledger where provider_id = sold_biz), 'the visit ledger must be kept';
  assert (select status from credentials where id = sold_cred) = 'revoked', 'the client''s pass must be revoked';
  assert close_provider(sold_biz, owner_id) = 'already_closed', 'closing twice says so';
  assert exists (select 1 from audit_log where action = 'provider.closed' and provider_id = sold_biz),
         'closing must be in the audit log';

  -- 5. browsers can't call these; the server can; owners can't set closed_at themselves
  assert not has_function_privilege('authenticated', 'delete_provider(uuid, uuid)', 'execute'), 'browsers must not delete';
  assert not has_function_privilege('anon', 'close_provider(uuid, uuid)', 'execute'), 'browsers must not close';
  assert has_function_privilege('service_role', 'delete_provider(uuid, uuid)', 'execute'), 'the server must delete';
  assert has_function_privilege('service_role', 'close_provider(uuid, uuid)', 'execute'), 'the server must close';
  assert not has_column_privilege('authenticated', 'providers', 'closed_at', 'update'),
         'owners must not set closed_at directly';
end;
$$;

rollback;   -- leave no test data behind

-- Only reached if every check above passed.
select 'ALL BUSINESS REMOVAL TESTS PASSED' as result;
