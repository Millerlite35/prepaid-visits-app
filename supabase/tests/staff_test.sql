-- Run after all migrations + seed.sql. Any failure stops the script with a red error.
-- Uses made-up user ids and rolls everything back, so no test data remains.
begin;

insert into provider_members (provider_id, user_id, role)
values ('00000000-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'owner');

do $$
declare
  pid   uuid := '00000000-0000-0000-0000-0000000000a1';
  owner uuid := '11111111-1111-1111-1111-111111111111';
  staff uuid := '66666666-6666-6666-6666-666666666666';
  other uuid := '77777777-7777-7777-7777-777777777777';
  inv1  uuid;
  inv2  uuid;
begin
  -- 1. invite, then re-invite the same email: only the newest invitation stays open
  inv1 := create_staff_invite(pid, ' Front.Desk@Example.com ', 'scan_only', owner);
  assert (select email from staff_invites where id = inv1) = 'front.desk@example.com', 'email should be stored lowercase';
  inv2 := create_staff_invite(pid, 'front.desk@example.com', 'manager', owner);
  assert (select cancelled_at is not null from staff_invites where id = inv1), 're-inviting should cancel the old invitation';
  assert (select role from staff_invites where id = inv2) = 'manager';

  -- 2. only the invited email can accept, and only once
  begin
    perform accept_staff_invite(inv2, other, 'someone.else@example.com');
    raise exception 'a different email should not be able to accept';
  exception when raise_exception then
    assert sqlerrm like '%different email%', 'unexpected: ' || sqlerrm;
  end;
  begin
    perform accept_staff_invite(inv1, staff, 'front.desk@example.com');
    raise exception 'a replaced invitation should not work';
  exception when raise_exception then
    assert sqlerrm like '%no longer valid%', 'unexpected: ' || sqlerrm;
  end;
  assert accept_staff_invite(inv2, staff, 'FRONT.DESK@example.com') = pid, 'the invited email should be able to accept';
  assert (select role from provider_members where provider_id = pid and user_id = staff) = 'manager';
  begin
    perform accept_staff_invite(inv2, staff, 'front.desk@example.com');
    raise exception 'accepting twice should fail';
  exception when raise_exception then
    assert sqlerrm like '%no longer valid%', 'unexpected: ' || sqlerrm;
  end;

  -- 3. expired invitations can't be accepted
  inv1 := create_staff_invite(pid, 'late@example.com', 'scan_only', owner);
  update staff_invites set expires_at = now() - interval '1 minute' where id = inv1;
  begin
    perform accept_staff_invite(inv1, other, 'late@example.com');
    raise exception 'an expired invitation should fail';
  exception when raise_exception then
    assert sqlerrm like '%expired%', 'unexpected: ' || sqlerrm;
  end;

  -- 4. change role and remove staff, but never the owner
  perform change_member_role(pid, staff, 'scan_only', owner);
  assert (select role from provider_members where provider_id = pid and user_id = staff) = 'scan_only';
  begin
    perform change_member_role(pid, owner, 'manager', owner);
    raise exception 'demoting the owner should fail';
  exception when raise_exception then
    assert sqlerrm like '%owner%', 'unexpected: ' || sqlerrm;
  end;
  begin
    perform remove_member(pid, owner, owner);
    raise exception 'removing the owner should fail';
  exception when raise_exception then
    assert sqlerrm like '%owner%', 'unexpected: ' || sqlerrm;
  end;
  perform remove_member(pid, staff, owner);
  assert not exists (select 1 from provider_members where provider_id = pid and user_id = staff), 'staff should be removed';

  -- 5. cancelled invitations can't be accepted
  inv1 := create_staff_invite(pid, 'cancel.me@example.com', 'scan_only', owner);
  perform cancel_staff_invite(pid, inv1, owner);
  begin
    perform accept_staff_invite(inv1, other, 'cancel.me@example.com');
    raise exception 'a cancelled invitation should fail';
  exception when raise_exception then
    assert sqlerrm like '%no longer valid%', 'unexpected: ' || sqlerrm;
  end;

  -- 6. only the server may call these
  assert not has_function_privilege('authenticated', 'accept_staff_invite(uuid, uuid, text)', 'execute'),
         'signed-in users must not accept invitations directly';
  assert not has_function_privilege('authenticated', 'create_staff_invite(uuid, text, text, uuid)', 'execute');
  assert not has_function_privilege('authenticated', 'remove_member(uuid, uuid, uuid)', 'execute');
end;
$$;

-- 7. strangers can't read invitations
set local role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from staff_invites;
  exception when insufficient_privilege then n := 0;
  end;
  assert n = 0, 'a stranger must not see invitations';
end $$;

reset role;
rollback;   -- leave no test data behind

select 'ALL STAFF TESTS PASSED' as result;
