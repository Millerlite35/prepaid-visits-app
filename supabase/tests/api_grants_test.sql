-- Run after all migrations. Any failure stops the script with a red error.
-- Checks the Data API access that 0018 spells out (and that fresh projects depend on).
-- Read-only.

do $$
declare
  t text;
begin
  -- the server (admin client) can reach every table and view
  foreach t in array array[
    'apple_registrations', 'audit_log', 'clients', 'credentials', 'package_templates', 'provider_members',
    'provider_terms', 'providers', 'purchases', 'refunds', 'staff_invites', 'stripe_events', 'visit_accounts',
    'visit_ledger', 'account_balances', 'purchase_balances', 'mfa_backup_codes', 'rate_limits', 'support_requests'
  ] loop
    assert has_table_privilege('service_role', 'public.' || t, 'select'), 'service_role must read ' || t;
  end loop;

  -- signed-in staff reach the RLS tables (rows still limited by policies)
  assert has_table_privilege('authenticated', 'public.clients', 'select');
  assert has_table_privilege('authenticated', 'public.package_templates', 'insert');
  assert has_table_privilege('authenticated', 'public.account_balances', 'select');

  -- providers: no inserts or whole-row updates from browsers, settings columns only
  assert not has_table_privilege('authenticated', 'public.providers', 'insert'), 'browsers must not create providers';
  assert not has_table_privilege('authenticated', 'public.providers', 'update'), 'no whole-row provider updates';
  assert has_column_privilege('authenticated', 'public.providers', 'display_name', 'update');
  assert not has_column_privilege('authenticated', 'public.providers', 'stripe_account_id', 'update'), 'Stripe fields stay locked';

  -- anonymous visitors never see balances
  assert not has_table_privilege('anon', 'public.account_balances', 'select'), 'anon must not read account_balances';
  assert not has_table_privilege('anon', 'public.purchase_balances', 'select'), 'anon must not read purchase_balances';

  -- server-only tables stay server-only
  foreach t in array array['mfa_backup_codes', 'rate_limits', 'support_requests'] loop
    assert not has_table_privilege('anon', 'public.' || t, 'select'), 'anon must not read ' || t;
    assert not has_table_privilege('authenticated', 'public.' || t, 'select'), 'authenticated must not read ' || t;
  end loop;
end $$;

select 'ALL API GRANT TESTS PASSED' as result;
