-- Onboarding: create a business and make the signing-up user its owner, in one step.
-- Called only by the server (service role) after it has checked the user is signed in
-- with two-step verification.

create or replace function create_provider(
  p_user_id      uuid,
  p_slug         text,
  p_display_name text,
  p_timezone     text default 'America/New_York'
)
returns providers
language plpgsql
as $$
declare
  v providers;
begin
  if p_user_id is null then
    raise exception 'user is required';
  end if;
  if length(trim(coalesce(p_display_name, ''))) not between 1 and 80 then
    raise exception 'business name must be 1 to 80 characters';
  end if;

  -- slug format is enforced by the check constraint on providers.slug
  insert into providers (slug, display_name, timezone)
  values (lower(p_slug), trim(p_display_name), p_timezone)
  returning * into v;

  insert into provider_members (provider_id, user_id, role)
  values (v.id, p_user_id, 'owner');

  insert into audit_log (provider_id, actor_id, action, entity, entity_id)
  values (v.id, p_user_id, 'provider.created', 'provider', v.id::text);

  return v;
end;
$$;

-- ------------------------------------------------------------------
-- Lock business functions to the server.
-- Supabase lets browsers call any public function by default (through the API with
-- the publishable key). These must only ever run from our server, so take that away.
-- The two policy helpers (is_provider_admin, is_two_step_verified) stay callable
-- because row-level security runs them as the signed-in user.
-- EVERY new business function needs the same revoke + grant.
-- ------------------------------------------------------------------
revoke execute on function
  mark_purchase_paid(uuid, text),
  record_visit(text, uuid, uuid, boolean),
  undo_visit(bigint, uuid),
  create_card_batch(uuid, integer, text),
  link_card(text, uuid, uuid),
  revoke_credential(uuid, uuid),
  expire_purchases(),
  create_provider(uuid, text, text, text)
from public, anon, authenticated;

grant execute on function
  mark_purchase_paid(uuid, text),
  record_visit(text, uuid, uuid, boolean),
  undo_visit(bigint, uuid),
  create_card_batch(uuid, integer, text),
  link_card(text, uuid, uuid),
  revoke_credential(uuid, uuid),
  expire_purchases(),
  create_provider(uuid, text, text, text)
to service_role;
