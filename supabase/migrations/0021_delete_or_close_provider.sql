-- Removing an old business (owner only, server only).
--
-- delete_provider: for a business that never sold anything (no purchases, no ledger rows).
--   Deletes it and everything hanging off it (packages, staff, unassigned QR cards, terms
--   history, invites) through the existing ON DELETE CASCADE links. The audit log keeps a
--   row (its provider_id becomes null; the name and id stay in the row).
--
-- close_provider: for a business with sales. Money and visit records must stay (taxes,
--   refunds, chargebacks, disputes; hard rule 3: the ledger is never rewritten). So it:
--   stamps providers.closed_at (hidden from dashboards, purchase page stops selling),
--   pauses every package, cancels every pass and card (check-ins answer "revoked"),
--   and makes a new private link key so old shared links stop working.
--   No refunds are made automatically: the owner decides, client by client.
--
-- Both lock the provider row, check the actor is its OWNER, and write an audit row.
-- providers.closed_at is NOT in the owners' column update grant (0006): only these functions set it.

alter table providers add column closed_at timestamptz;

create or replace function delete_provider(p_provider_id uuid, p_actor_id uuid)
returns text  -- deleted | has_sales | not_owner | not_found
language plpgsql
as $$
declare
  v providers;
begin
  select * into v from providers where id = p_provider_id for update;
  if not found then
    return 'not_found';
  end if;
  if not exists (
    select 1 from provider_members
    where provider_id = p_provider_id and user_id = p_actor_id and role = 'owner'
  ) then
    return 'not_owner';
  end if;
  if exists (select 1 from purchases where provider_id = p_provider_id)
     or exists (select 1 from visit_ledger where provider_id = p_provider_id) then
    return 'has_sales';
  end if;

  insert into audit_log (provider_id, actor_id, action, entity, entity_id, metadata)
  values (p_provider_id, p_actor_id, 'provider.deleted', 'provider', p_provider_id::text,
          jsonb_build_object('name', v.display_name, 'slug', v.slug));
  delete from providers where id = p_provider_id;
  return 'deleted';
end;
$$;

create or replace function close_provider(p_provider_id uuid, p_actor_id uuid)
returns text  -- closed | already_closed | not_owner | not_found
language plpgsql
as $$
declare
  v providers;
  v_packages integer;
  v_credentials integer;
begin
  select * into v from providers where id = p_provider_id for update;
  if not found then
    return 'not_found';
  end if;
  if not exists (
    select 1 from provider_members
    where provider_id = p_provider_id and user_id = p_actor_id and role = 'owner'
  ) then
    return 'not_owner';
  end if;
  if v.closed_at is not null then
    return 'already_closed';
  end if;

  update providers
     set closed_at = now(),
         page_access = 'private',
         private_access_key = replace(gen_random_uuid()::text, '-', '')
   where id = p_provider_id;

  update package_templates set active = false where provider_id = p_provider_id and active;
  get diagnostics v_packages = row_count;

  update credentials
     set status = 'revoked', revoked_at = now()
   where provider_id = p_provider_id and status in ('active', 'unassigned');
  get diagnostics v_credentials = row_count;

  insert into audit_log (provider_id, actor_id, action, entity, entity_id, metadata)
  values (p_provider_id, p_actor_id, 'provider.closed', 'provider', p_provider_id::text,
          jsonb_build_object('packages_paused', v_packages, 'passes_cancelled', v_credentials));
  return 'closed';
end;
$$;

-- server only (Supabase makes functions browser-callable by default)
revoke execute on function delete_provider(uuid, uuid), close_provider(uuid, uuid) from public, anon, authenticated;
grant execute on function delete_provider(uuid, uuid), close_provider(uuid, uuid) to service_role;
