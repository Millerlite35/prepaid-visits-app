-- Run after all migrations. Any failure stops the script with a red error.
-- Rolls everything back, so no test data remains.
begin;

do $$
declare
  pid uuid := '00000000-0000-0000-0000-0000000000a1'; -- the demo provider from seed.sql
begin
  -- signed-in owners may edit the contact columns (row-level security still decides which rows)
  assert has_column_privilege('authenticated', 'providers', 'office_address', 'UPDATE'), 'owners must be able to edit the address';
  assert has_column_privilege('authenticated', 'providers', 'office_phone', 'UPDATE'), 'owners must be able to edit the phone';
  assert has_column_privilege('authenticated', 'providers', 'office_website', 'UPDATE'), 'owners must be able to edit the website';
  -- and still not the Stripe fields
  assert not has_column_privilege('authenticated', 'providers', 'stripe_account_id', 'UPDATE'), 'Stripe fields must stay locked';

  update providers set office_address = '12 Main St, Springfield', office_phone = '(555) 010-0000', office_website = 'example.com'
   where id = pid;
  assert (select office_phone from providers where id = pid) = '(555) 010-0000';

  -- overly long values are refused by the database
  begin
    update providers set office_phone = repeat('1', 41) where id = pid;
    raise exception 'a 41-character phone should have failed';
  exception when check_violation then null;
  end;
end $$;

rollback;

select 'ALL PROVIDER CONTACT TESTS PASSED' as result;
