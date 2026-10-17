-- Run after all migrations + seed.sql. Any failure stops the script with a red error.
-- Rolls everything back, so no test data remains.
begin;

do $$
declare
  pid  uuid := '00000000-0000-0000-0000-0000000000a1';
  r    record;
  x    record;
  acct uuid;
  pur  uuid;
  pi   text := 'pi_test_ext_' || substr(md5(random()::text), 1, 8);
  pi2  text := 'pi_test_ext_' || substr(md5(random()::text), 1, 8);
  bal  int;
begin
  -- setup: a paid 3-visit, $300 package ($100 a visit)
  select * into r from complete_checkout(pid, 'cs_test_' || substr(md5(random()::text), 1, 12), pi,
    'Morgan Test', 'morgan@example.com', null, 'Starter', 3, 30000, 'usd', 365, 1, now());
  acct := r.visit_account_id;
  pur := r.purchase_id;

  -- 1. a $150 refund in the Stripe dashboard removes 1 visit (rounded down), not 2
  select * into x from record_external_refund(pid, pi, 15000, 'stripe:re_test_1', 're_test_1', 'Refunded in Stripe');
  assert x.is_new and x.visits_removed = 1, 'expected 1 visit removed, got ' || x.visits_removed;
  select usable_visits into bal from account_balances where visit_account_id = acct;
  assert bal = 2, 'expected 2 left, got ' || bal;
  assert (select status from purchases where id = pur) = 'partially_refunded';

  -- 2. Stripe repeating the same message changes nothing
  select * into x from record_external_refund(pid, pi, 15000, 'stripe:re_test_1', 're_test_1', 'Refunded in Stripe');
  assert not x.is_new, 'a repeat must not be new';
  select usable_visits into bal from account_balances where visit_account_id = acct;
  assert bal = 2, 'a repeat must not remove more visits';

  -- 3. refunding the rest fully removes every unused visit, whatever the maths says
  select * into x from record_external_refund(pid, pi, 15000, 'stripe:re_test_2', 're_test_2', 'Refunded in Stripe');
  assert x.visits_removed = 2, 'a full refund should remove all unused visits, got ' || x.visits_removed;
  assert (select status from purchases where id = pur) = 'refunded';

  -- 4. the app's own refund limit now sees the money as gone
  begin
    perform begin_refund(pid, pur, 0, 100, null, 'req-after-external', null);
    raise exception 'refunding again should fail';
  exception when raise_exception then
    assert sqlerrm like '%can''t be refunded%' or sqlerrm like '%left to refund%', 'unexpected: ' || sqlerrm;
  end;

  -- 5. a lost dispute on a second purchase works the same way (no Stripe refund id)
  select * into r from complete_checkout(pid, 'cs_test_' || substr(md5(random()::text), 1, 12), pi2,
    'Morgan Test', 'morgan@example.com', null, 'Standard', 6, 60000, 'usd', 365, 1, now());
  select * into x from record_external_refund(pid, pi2, 60000, 'dispute:dp_test_1', null, 'Card dispute lost');
  assert x.visits_removed = 6, 'a lost dispute for the full amount removes all 6, got ' || x.visits_removed;

  -- 6. a payment that isn't ours, or the wrong provider, is refused
  begin
    perform record_external_refund(pid, 'pi_not_ours', 100, 'stripe:re_x', 're_x', 'x');
    raise exception 'an unknown payment should fail';
  exception when raise_exception then
    assert sqlerrm like '%no purchase%', 'unexpected: ' || sqlerrm;
  end;
  begin
    perform record_external_refund(gen_random_uuid(), pi, 100, 'stripe:re_y', 're_y', 'x');
    raise exception 'another provider should fail';
  exception when raise_exception then
    assert sqlerrm like '%no purchase%', 'unexpected: ' || sqlerrm;
  end;

  -- 7. the ledger still adds up (hard rule 3): +3 -1 -2 +6 -6 = 0
  assert (select sum(delta) from visit_ledger where visit_account_id = acct) = 0, 'ledger must add up';

  -- 8. only the server may call it
  assert not has_function_privilege('authenticated', 'record_external_refund(uuid, text, integer, text, text, text)', 'execute');
  assert not has_function_privilege('anon', 'record_external_refund(uuid, text, integer, text, text, text)', 'execute');
end;
$$;

rollback;   -- leave no test data behind

select 'ALL EXTERNAL REFUND TESTS PASSED' as result;
