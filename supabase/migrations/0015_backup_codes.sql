-- One-time backup codes for two-step verification, so a staff member who loses their
-- phone can get back in without help. Only a SHA-256 hash of each code is stored (the
-- server hashes before calling). Server-only: browsers can't read or call any of this.

create table mfa_backup_codes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  code_hash  text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  used_at    timestamptz
);
create index mfa_backup_codes_user_idx on mfa_backup_codes (user_id);

alter table mfa_backup_codes enable row level security;
revoke all on mfa_backup_codes from anon, authenticated;

-- New set of codes: the old ones (used or not) stop working.
create or replace function replace_backup_codes(p_user_id uuid, p_hashes text[])
returns void
language plpgsql
as $$
begin
  if coalesce(array_length(p_hashes, 1), 0) not between 5 and 20 then
    raise exception 'expected 5 to 20 codes';
  end if;
  delete from mfa_backup_codes where user_id = p_user_id;
  insert into mfa_backup_codes (user_id, code_hash) select p_user_id, unnest(p_hashes);
  insert into audit_log (actor_id, action, entity, entity_id, metadata)
  values (p_user_id, 'backup_codes.created', 'user', p_user_id::text,
          jsonb_build_object('count', array_length(p_hashes, 1)));
end;
$$;

-- Use one code. true = it was valid and unused (and is now used up).
create or replace function use_backup_code(p_user_id uuid, p_hash text)
returns boolean
language plpgsql
as $$
declare
  v_id bigint;
begin
  update mfa_backup_codes set used_at = now()
  where user_id = p_user_id and code_hash = p_hash and used_at is null
  returning id into v_id;

  insert into audit_log (actor_id, action, entity, entity_id, metadata)
  values (p_user_id, case when v_id is null then 'backup_code.rejected' else 'backup_code.used' end,
          'user', p_user_id::text, '{}'::jsonb);
  return v_id is not null;
end;
$$;

revoke execute on function replace_backup_codes(uuid, text[]) from public, anon, authenticated;
revoke execute on function use_backup_code(uuid, text) from public, anon, authenticated;
grant execute on function replace_backup_codes(uuid, text[]) to service_role;
grant execute on function use_backup_code(uuid, text) to service_role;
