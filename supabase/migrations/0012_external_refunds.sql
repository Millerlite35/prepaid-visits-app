-- Refunds that happen OUTSIDE the app: a provider refunding in their Stripe dashboard, or a
-- card dispute (chargeback) the provider lost. Called only by the server's Stripe webhook
-- (service role). Balances still come only from visit_ledger (hard rule 3).
--
-- Visits removed:
--   * if the purchase is now fully refunded: all of its unused visits
--   * otherwise: in proportion to the amount (rounded down), never more than are unused
-- Safe to call twice for the same Stripe refund / dispute (p_request_id is unique).

create or replace function record_external_refund(
  p_provider_id      uuid,
  p_payment_intent   text,
  p_amount_cents     integer,
  p_request_id       text,      -- 'stripe:re_...' or 'dispute:dp_...'
  p_stripe_refund_id text,      -- the Stripe refund id, or null for a dispute
  p_reason           text
)
returns table (purchase_id uuid, visits_removed integer, is_new boolean)
language plpgsql
as $$
declare
  p           purchases;
  v_existing  refunds;
  v_remaining integer;
  v_refunded  integer;
  v_visits    integer;
  v_ledger    bigint;
  v_status    text;
begin
  select * into v_existing from refunds r where r.request_id = p_request_id;
  if found then
    return query select v_existing.purchase_id, v_existing.visits, false;
    return;
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'refund amount must be positive';
  end if;

  select * into p from purchases
   where stripe_payment_intent_id = p_payment_intent and provider_id = p_provider_id
   for update;
  if not found then
    raise exception 'no purchase for payment % on this provider', p_payment_intent;
  end if;

  -- lock the client's account so a check-in can't race this
  perform 1 from visit_accounts where id = p.visit_account_id for update;

  select coalesce(sum(delta), 0) into v_remaining from visit_ledger where visit_ledger.purchase_id = p.id;
  select coalesce(sum(amount_cents), 0) into v_refunded
    from refunds r where r.purchase_id = p.id and r.status in ('pending', 'succeeded');

  if v_refunded + p_amount_cents >= p.price_cents then
    v_visits := v_remaining;
  else
    v_visits := least(v_remaining, floor(p_amount_cents::numeric * p.visits_purchased / nullif(p.price_cents, 0))::integer);
  end if;
  v_visits := greatest(coalesce(v_visits, 0), 0);

  if v_visits > 0 then
    insert into visit_ledger (provider_id, visit_account_id, purchase_id, kind, delta, note)
    values (p.provider_id, p.visit_account_id, p.id, 'refund', -v_visits, left(p_reason, 200))
    returning id into v_ledger;
  end if;

  insert into refunds (provider_id, purchase_id, request_id, visits, amount_cents, status,
                       stripe_refund_id, ledger_id, reason, completed_at)
  values (p.provider_id, p.id, p_request_id, v_visits, p_amount_cents, 'succeeded',
          p_stripe_refund_id, v_ledger, left(p_reason, 200), now());

  v_status := case when v_refunded + p_amount_cents >= p.price_cents and v_remaining - v_visits = 0
                   then 'refunded' else 'partially_refunded' end;
  update purchases set status = v_status where id = p.id;

  insert into audit_log (provider_id, action, entity, entity_id, metadata)
  values (p.provider_id, 'refund.external', 'purchase', p.id::text,
          jsonb_build_object('request_id', p_request_id, 'amount_cents', p_amount_cents, 'visits', v_visits));

  return query select p.id, v_visits, true;
end;
$$;

revoke execute on function record_external_refund(uuid, text, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function record_external_refund(uuid, text, integer, text, text, text) to service_role;
