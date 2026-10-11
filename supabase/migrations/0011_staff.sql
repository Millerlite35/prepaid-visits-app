-- Staff invitations and management. Server-only functions (service role), called after the
-- server has checked the user is the business owner (or, for accepting, that the signed-in
-- user's confirmed email matches the invitation).
-- Roles: owner (one, the creator; can't be demoted or removed here), manager, scan_only.

create table staff_invites (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  email       text not null check (email = lower(email)),
  role        text not null check (role in ('manager', 'scan_only')),
  created_by  uuid,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid,
  cancelled_at timestamptz
);
-- at most one open invitation per email per business
create unique index staff_invites_open_uidx on staff_invites (provider_id, email)
  where accepted_at is null and cancelled_at is null;
create index staff_invites_email_idx on staff_invites (email);

alter table staff_invites enable row level security;
create policy staff_invites_read on staff_invites for select using (is_provider_admin(provider_id));
create policy require_two_step on staff_invites as restrictive for all to authenticated using (is_two_step_verified());

-- Invite (or re-invite: replaces any open invitation for that email, refreshing the role
-- and expiry). Returns the invitation id.
create or replace function create_staff_invite(p_provider_id uuid, p_email text, p_role text, p_user_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id    uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'enter a valid email address';
  end if;
  if p_role not in ('manager', 'scan_only') then
    raise exception 'role must be manager or scan_only';
  end if;

  update staff_invites set cancelled_at = now()
   where provider_id = p_provider_id and email = v_email and accepted_at is null and cancelled_at is null;

  insert into staff_invites (provider_id, email, role, created_by)
  values (p_provider_id, v_email, p_role, p_user_id)
  returning id into v_id;

  insert into audit_log (provider_id, actor_id, action, entity, entity_id, metadata)
  values (p_provider_id, p_user_id, 'staff.invited', 'staff_invite', v_id::text, jsonb_build_object('role', p_role));
  return v_id;
end;
$$;

create or replace function cancel_staff_invite(p_provider_id uuid, p_invite_id uuid, p_user_id uuid)
returns void
language plpgsql
as $$
begin
  update staff_invites set cancelled_at = now()
   where id = p_invite_id and provider_id = p_provider_id and accepted_at is null and cancelled_at is null;
  if found then
    insert into audit_log (provider_id, actor_id, action, entity, entity_id)
    values (p_provider_id, p_user_id, 'staff.invite_cancelled', 'staff_invite', p_invite_id::text);
  end if;
end;
$$;

-- The invited person accepts. p_email must be the signed-in user's confirmed email.
-- Returns the provider id they joined.
create or replace function accept_staff_invite(p_invite_id uuid, p_user_id uuid, p_email text)
returns uuid
language plpgsql
as $$
declare
  i staff_invites;
begin
  select * into i from staff_invites where id = p_invite_id for update;
  if not found or i.cancelled_at is not null or i.accepted_at is not null then
    raise exception 'this invitation is no longer valid';
  end if;
  if i.expires_at <= now() then
    raise exception 'this invitation has expired';
  end if;
  if i.email <> lower(trim(coalesce(p_email, ''))) then
    raise exception 'this invitation is for a different email address';
  end if;
  if exists (select 1 from provider_members where provider_id = i.provider_id and user_id = p_user_id) then
    raise exception 'you are already a member of this business';
  end if;

  insert into provider_members (provider_id, user_id, role) values (i.provider_id, p_user_id, i.role);
  update staff_invites set accepted_at = now(), accepted_by = p_user_id where id = i.id;

  insert into audit_log (provider_id, actor_id, action, entity, entity_id, metadata)
  values (i.provider_id, p_user_id, 'staff.joined', 'provider_member', p_user_id::text, jsonb_build_object('role', i.role));
  return i.provider_id;
end;
$$;

create or replace function change_member_role(p_provider_id uuid, p_member_id uuid, p_role text, p_user_id uuid)
returns void
language plpgsql
as $$
declare
  v_current text;
begin
  if p_role not in ('manager', 'scan_only') then
    raise exception 'role must be manager or scan_only';
  end if;
  select role into v_current from provider_members where provider_id = p_provider_id and user_id = p_member_id for update;
  if not found then
    raise exception 'not a member of this business';
  end if;
  if v_current = 'owner' then
    raise exception 'the owner''s role can''t be changed';
  end if;
  update provider_members set role = p_role where provider_id = p_provider_id and user_id = p_member_id;
  insert into audit_log (provider_id, actor_id, action, entity, entity_id, metadata)
  values (p_provider_id, p_user_id, 'staff.role_changed', 'provider_member', p_member_id::text,
          jsonb_build_object('from', v_current, 'to', p_role));
end;
$$;

create or replace function remove_member(p_provider_id uuid, p_member_id uuid, p_user_id uuid)
returns void
language plpgsql
as $$
declare
  v_current text;
begin
  select role into v_current from provider_members where provider_id = p_provider_id and user_id = p_member_id for update;
  if not found then
    raise exception 'not a member of this business';
  end if;
  if v_current = 'owner' then
    raise exception 'the owner can''t be removed';
  end if;
  delete from provider_members where provider_id = p_provider_id and user_id = p_member_id;
  insert into audit_log (provider_id, actor_id, action, entity, entity_id, metadata)
  values (p_provider_id, p_user_id, 'staff.removed', 'provider_member', p_member_id::text, jsonb_build_object('role', v_current));
end;
$$;

revoke execute on function
  create_staff_invite(uuid, text, text, uuid),
  cancel_staff_invite(uuid, uuid, uuid),
  accept_staff_invite(uuid, uuid, text),
  change_member_role(uuid, uuid, text, uuid),
  remove_member(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function
  create_staff_invite(uuid, text, text, uuid),
  cancel_staff_invite(uuid, uuid, uuid),
  accept_staff_invite(uuid, uuid, text),
  change_member_role(uuid, uuid, text, uuid),
  remove_member(uuid, uuid, uuid)
to service_role;
