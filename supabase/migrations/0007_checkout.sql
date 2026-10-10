-- Checkout: record a paid Stripe Checkout session in one atomic step.
-- Called only by the server's Stripe webhook (service role) after it has verified the
-- event came from Stripe. Nothing about the client is stored until they have paid
-- (minimal data: abandoned checkouts leave no rows).
--
-- Safe to call twice for the same session (webhook retries): the second call returns
-- the existing purchase and does not grant visits again.

create or replace function complete_checkout(
  p_provider_id       uuid,
  p_session_id        text,
  p_payment_intent    text,
  p_full_name         text,
  p_email             text,
  p_template_id       uuid,
  p_package_name      text,
  p_visits            integer,
  p_price_cents       integer,
  p_currency          text,
  p_expires_days      integer,
  p_terms_version     integer,
  p_terms_accepted_at timestamptz
)
returns table (purchase_id uuid, visit_account_id uuid, credential_id uuid, is_new boolean)
language plpgsql
as $$
declare
  v_email     text := lower(trim(p_email));
  v_client    uuid;
  v_account   uuid;
  v_purchase  uuid;
  v_cred      uuid;
begin
  -- already recorded (Stripe retried the webhook)
  select p.id, p.visit_account_id into v_purchase, v_account
    from purchases p where p.stripe_checkout_session_id = p_session_id;
  if found then
    select c.id into v_cred from credentials c
     where c.visit_account_id = v_account and c.kind = 'wallet' and c.status = 'active'
     order by c.issued_at desc limit 1;
    return query select v_purchase, v_account, v_cred, false;
    return;
  end if;

  if length(trim(coalesce(p_full_name, ''))) = 0 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'checkout is missing a valid name or email';
  end if;

  -- one client and one visit account per email, per provider; new packages top it up
  select c.id into v_client from clients c
   where c.provider_id = p_provider_id and lower(c.email) = v_email;
  if not found then
    insert into clients (provider_id, full_name, email)
    values (p_provider_id, trim(p_full_name), v_email)
    returning id into v_client;
  end if;

  select a.id into v_account from visit_accounts a where a.client_id = v_client;
  if not found then
    insert into visit_accounts (provider_id, client_id)
    values (p_provider_id, v_client)
    returning id into v_account;
  end if;

  insert into purchases (
    provider_id, visit_account_id, package_template_id, package_name, visits_purchased,
    price_cents, currency, expires_days, stripe_checkout_session_id, terms_version,
    terms_accepted_at
  ) values (
    p_provider_id, v_account, p_template_id, p_package_name, p_visits,
    p_price_cents, coalesce(p_currency, 'usd'), p_expires_days, p_session_id, p_terms_version,
    p_terms_accepted_at
  )
  returning id into v_purchase;

  -- grants the visits through the ledger (and sets expires_at)
  perform mark_purchase_paid(v_purchase, p_payment_intent);

  -- the client's wallet pass: reuse their active one, or issue a new random token
  select c.id into v_cred from credentials c
   where c.visit_account_id = v_account and c.kind = 'wallet' and c.status = 'active'
   order by c.issued_at desc limit 1;
  if not found then
    insert into credentials (provider_id, visit_account_id, kind, status)
    values (p_provider_id, v_account, 'wallet', 'active')
    returning id into v_cred;
  end if;

  insert into audit_log (provider_id, action, entity, entity_id, metadata)
  values (p_provider_id, 'checkout.completed', 'purchase', v_purchase::text,
          jsonb_build_object('stripe_checkout_session_id', p_session_id));

  return query select v_purchase, v_account, v_cred, true;
end;
$$;

revoke execute on function
  complete_checkout(uuid, text, text, text, text, uuid, text, integer, integer, text, integer, integer, timestamptz)
from public, anon, authenticated;
grant execute on function
  complete_checkout(uuid, text, text, text, text, uuid, text, integer, integer, text, integer, integer, timestamptz)
to service_role;
