-- Run after all migrations. Any failure stops the script with a red error.
-- Rolls everything back, so no test data remains.
begin;

do $$
declare
  pid uuid := '00000000-0000-0000-0000-0000000000a1'; -- the demo provider from seed.sql
begin
  assert has_column_privilege('authenticated', 'providers', 'usual_price_cents', 'UPDATE'), 'owners must be able to edit the regular price';

  update providers set usual_price_cents = 15000 where id = pid;
  assert (select usual_price_cents from providers where id = pid) = 15000;

  update providers set usual_price_cents = null where id = pid; -- optional
  begin
    update providers set usual_price_cents = 50 where id = pid;
    raise exception 'a price under $1 should have failed';
  exception when check_violation then null;
  end;
end $$;

rollback;

select 'ALL USUAL PRICE TESTS PASSED' as result;
