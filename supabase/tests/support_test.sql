-- Run after all migrations + seed.sql. Any failure stops the script with a red error.
-- Rolls everything back, so no test data remains.
begin;

insert into support_requests (user_id, email, topic, message)
values ('11111111-1111-1111-1111-111111111111', 'owner@example.com', 'payments', 'Test message');

-- the checks reject bad rows
do $$ begin
  begin
    insert into support_requests (user_id, email, topic, message) values (gen_random_uuid(), 'a@b.co', 'nonsense', 'x');
    raise exception 'an unknown topic should fail';
  exception when check_violation then null;
  end;
  begin
    insert into support_requests (user_id, email, topic, message) values (gen_random_uuid(), 'a@b.co', 'other', '');
    raise exception 'an empty message should fail';
  exception when check_violation then null;
  end;
end $$;

-- browsers (signed in or not) can't read or write support requests
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
do $$
declare n int;
begin
  begin
    select count(*) into n from support_requests;
  exception when insufficient_privilege then n := 0;
  end;
  assert n = 0, 'signed-in users must not read support requests directly, even their own';
  begin
    insert into support_requests (user_id, email, topic, message)
    values ('11111111-1111-1111-1111-111111111111', 'x@example.com', 'other', 'sneaky');
    raise exception 'signed-in users must not insert directly';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from support_requests;
  exception when insufficient_privilege then n := 0;
  end;
  assert n = 0, 'strangers must not read support requests';
end $$;

reset role;
rollback;

select 'ALL SUPPORT TESTS PASSED' as result;
