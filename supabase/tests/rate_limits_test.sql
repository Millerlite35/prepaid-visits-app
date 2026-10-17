-- Run after all migrations. Any failure stops the script with a red error.
-- Rolls everything back, so no test data remains.
begin;

do $$
declare
  b text := 'test:' || substr(md5(random()::text), 1, 10);
begin
  -- a limit of 3 allows exactly 3 hits in the window
  assert hit_rate_limit(b, 3, 600), 'hit 1 should be allowed';
  assert hit_rate_limit(b, 3, 600), 'hit 2 should be allowed';
  assert hit_rate_limit(b, 3, 600), 'hit 3 should be allowed';
  assert not hit_rate_limit(b, 3, 600), 'hit 4 should be refused';
  -- other buckets are counted separately
  assert hit_rate_limit(b || ':other', 3, 600), 'a different bucket has its own count';

  -- only the server may use it
  assert not has_function_privilege('anon', 'hit_rate_limit(text, integer, integer)', 'execute');
  assert not has_function_privilege('authenticated', 'hit_rate_limit(text, integer, integer)', 'execute');
end $$;

set local role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from rate_limits;
  exception when insufficient_privilege then n := 0;
  end;
  assert n = 0, 'strangers must not read rate limits';
end $$;

reset role;
rollback;

select 'ALL RATE LIMIT TESTS PASSED' as result;
