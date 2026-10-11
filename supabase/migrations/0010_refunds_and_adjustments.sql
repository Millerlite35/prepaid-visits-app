-- Refunds and manual adjustments. All functions are server-only (service role), run after
-- the server has checked the user is the business owner. Balances still come only from
-- visit_ledger (hard rule 3): every change here is a ledger row.

-- ------------------------------------------------------------------
-- Refund records (one per refund attempt)
-- ------------------------------------------------------------------
create table refunds (
  id               uuid primary key default gen_random_uuid(),
  provider_id      uuid not null references providers(id) on delete cascade,
  purchase_id      uuid not null references purchases(id) on delete cascade,
  request_id       text not null unique,          -- from the form; a double click is the same refund
  visits           integer not null check (visits >= 0),
  amount_cents     integer not null check (amount_cents > 0),
  status           text not null default 'pending' check (status in ('pending','succeeded','failed')),
  stripe_refund_id text unique,
  ledger_id        bigint references visit_ledger(id),
  reason           text,
  error            text,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);
create index refunds_purchase_idx on refunds (purchase_id);

alter table refunds enable row level security;
create policy refunds_read on refunds for select using (is_provider_admin(provider_id));
create policy require_two_step on refunds as restrictive for all to authenticated using (is_two_step_verified());

-- ------------------------------------------------------------------
-- Step 1 of a refund: check, reserve the visits (ledger row), record "pending".
-- Returns the refund id. Repeating the same request_id returns the same refund.
-- ------------------------------------------------------------------
create or replace function begin_refund(
  p_provider_id  uuid,
  p_purchase_id  uuid,
  p_visits       integer,
  p_amount_cents integer,
  p_reason       text,
  p_request_id   text,
  p_user_id      uuid
)
returns uuid
language plpgsql
as $$
declare
  v_existing  uuid;
  p           purchases;
  v_remaining integer;
  v_refunded  integer;
  v_ledger    bigint;
  v_refund    uuid;
begin
  select id into v_existing from refunds where request_id = p_request_id;
  if found then
    return v_existing;
  end if;

  select * into p from purchases where id = p_purchase_id and provider_id = p_provider_id for update;
  if not found then
    raise exception 'purchase not found for this provider';
  end if;
  if p.status not in ('paid', 'partially_refunded') then
    raise exception 'this purchase can''t be refunded (status %)', p.status;
  end if;
  if p.stripe_payment_intent_id is null then
    raise exception 'this purchase has no Stripe payment to refund';
  end if;
  if p_visits < 0 or p_amount_cents <= 0 then
    raise exception 'refund must be a positive amount';
  end if;

  -- lock the client's account so a check-in or another refund can't race this one
  perform 1 from visit_accounts where id = p.visit_account_id for update;

  select coalesce(sum(delta), 0) into v_remaining from visit_ledger where purchase_id = p.id;
  if p_visits > v_remaining then
    raise exception 'only % unused visit(s) left on this purchase', v_remaining;
  end if;

  select coalesce(sum(amount_cents), 0) into v_refunded
    from refunds where purchase_id = p.id and status in ('pending', 'succeeded');
  if p_amount_cents > p.price_cents - v_refunded then
    raise exception 'refund is more than the % cents left to refund', p.price_cents - v_refunded;
  end if;

  if p_visits > 0 then
    insert into visit_ledger (provider_id, visit_account_id, purchase_id, kind, delta, performed_by, note)
    values (p.provider_id, p.visit_account_id, p.id, 'refund', -p_visits, p_user_id, 'Refund')
    returning id into v_ledger;
  end if;

  insert into refunds (provider_id, purchase_id, request_id, visits, amount_cents, ledger_id, reason, created_by)
  values (p.provider_id, p.id, p_request_id, p_visits, p_amount_cents, v_ledger, nullif(trim(p_reason), ''), p_user_id)
  returning id into v_refund;

  insert into audit_log (provider_id, actor_id, action, entity, entity_id, metadata)
  values (p.provider_id, p_user_id, 'refund.started', 'purchase', p.id::text,
          jsonb_build_object('refund_id', v_refund, 'visits', p_visits, 'amount_cents', p_amount_cents));
  return v_refund;
end;
$$;

-- ------------------------------------------------------------------
-- Step 2a: Stripe refunded the money. Safe to call twice.
-- ------------------------------------------------------------------
create or replace function finish_refund(p_refund_id uuid, p_stripe_refund_id text)
returns void
language plpgsql
as $$
declare
  r           refunds;
  p           purchases;
  v_refunded  integer;
  v_remaining integer;
begin
  select * into r from refunds where id = p_refund_id for update;
  if not found then
    raise exception 'refund % not found', p_refund_id;
  end if;
  if r.status = 'succeeded' then
    return;
  end if;
  if r.status <> 'pending' then
    raise exception 'refund % is %, cannot finish it', p_refund_id, r.status;
  end if;

  update refunds set status = 'succeeded', stripe_refund_id = p_stripe_refund_id, completed_at = now()
   where id = r.id;

  select * into p from purchases where id = r.purchase_id for update;
  select coalesce(sum(amount_cents), 0) into v_refunded from refunds where purchase_id = p.id and status = 'succeeded';
  select coalesce(sum(delta), 0) into v_remaining from visit_ledger where purchase_id = p.id;
  update purchases
     set status = case when v_refunded >= p.price_cents and v_remaining = 0 then 'refunded' else 'partially_refunded' end
   where id = p.id;

  insert into audit_log (provider_id, actor_id, action, entity, entity_id, metadata)
  values (r.provider_id, r.created_by, 'refund.succeeded', 'purchase', r.purchase_id::text,
          jsonb_build_object('refund_id', r.id, 'stripe_refund_id', p_stripe_refund_id));
end;
$$;

-- ------------------------------------------------------------------
-- Step 2b: Stripe refused. Put the reserved visits back. Safe to call twice.
-- ------------------------------------------------------------------
create or replace function fail_refund(p_refund_id uuid, p_error text)
returns void
language plpgsql
as $$
declare
  r refunds;
  d visit_ledger;
begin
  select * into r from refunds where id = p_refund_id for update;
  if not found or r.status <> 'pending' then
    return;
  end if;

  update refunds set status = 'failed', error = left(p_error, 500), completed_at = now() where id = r.id;

  if r.ledger_id is not null then
    select * into d from visit_ledger where id = r.ledger_id;
    insert into visit_ledger (provider_id, visit_account_id, purchase_id, kind, delta, performed_by, reverses_id, note)
    values (d.provider_id, d.visit_account_id, d.purchase_id, 'adjust', -d.delta, r.created_by, d.id, 'Refund failed, visits restored');
  end if;

  insert into audit_log (provider_id, actor_id, action, entity, entity_id, metadata)
  values (r.provider_id, r.created_by, 'refund.failed', 'purchase', r.purchase_id::text,
          jsonb_build_object('refund_id', r.id, 'error', left(p_error, 200)));
end;
$$;

-- ------------------------------------------------------------------
-- Manual adjustment: add or remove visits with a required note. Returns the new usable
-- balance. Removing takes from the soonest-expiring packages first. Adding goes onto the
-- client's latest usable package, or a "Complimentary" entry if they have none.
-- ------------------------------------------------------------------
create or replace function adjust_visits(
  p_provider_id      uuid,
  p_visit_account_id uuid,
  p_delta            integer,
  p_note             text,
  p_user_id          uuid
)
returns integer
language plpgsql
as $$
declare
  v_note     text := trim(coalesce(p_note, ''));
  v_usable   integer;
  v_need     integer;
  v_take     integer;
  v_target   uuid;
  v_terms    integer;
  b          record;
begin
  if p_delta = 0 or abs(p_delta) > 100 then
    raise exception 'change must be between -100 and 100, and not zero';
  end if;
  if length(v_note) = 0 or length(v_note) > 200 then
    raise exception 'a note (up to 200 characters) is required';
  end if;

  perform 1 from visit_accounts where id = p_visit_account_id and provider_id = p_provider_id for update;
  if not found then
    raise exception 'visit account does not belong to this provider';
  end if;

  if p_delta > 0 then
    select b2.purchase_id into v_target
      from purchase_balances b2
     where b2.visit_account_id = p_visit_account_id
       and (b2.expires_at is null or b2.expires_at > now())
     order by b2.expires_at desc nulls first
     limit 1;

    if v_target is null then
      select terms_version into v_terms from providers where id = p_provider_id;
      insert into purchases (provider_id, visit_account_id, package_name, visits_purchased, price_cents,
                             status, terms_version, terms_accepted_at, paid_at)
      values (p_provider_id, p_visit_account_id, 'Complimentary', p_delta, 0,
              'paid', v_terms, now(), now())
      returning id into v_target;
    end if;

    insert into visit_ledger (provider_id, visit_account_id, purchase_id, kind, delta, performed_by, note)
    values (p_provider_id, p_visit_account_id, v_target, 'adjust', p_delta, p_user_id, v_note);
  else
    v_need := -p_delta;
    select coalesce(usable_visits, 0) into v_usable from account_balances where visit_account_id = p_visit_account_id;
    if v_usable < v_need then
      raise exception 'only % visit(s) available to remove', v_usable;
    end if;

    for b in
      select purchase_id, remaining from purchase_balances
       where visit_account_id = p_visit_account_id
         and remaining > 0
         and (expires_at is null or expires_at > now())
       order by expires_at asc nulls last, purchase_id
    loop
      exit when v_need = 0;
      v_take := least(b.remaining, v_need);
      insert into visit_ledger (provider_id, visit_account_id, purchase_id, kind, delta, performed_by, note)
      values (p_provider_id, p_visit_account_id, b.purchase_id, 'adjust', -v_take, p_user_id, v_note);
      v_need := v_need - v_take;
    end loop;
  end if;

  insert into audit_log (provider_id, actor_id, action, entity, entity_id, metadata)
  values (p_provider_id, p_user_id, 'visits.adjusted', 'visit_account', p_visit_account_id::text,
          jsonb_build_object('delta', p_delta, 'note', v_note));

  select coalesce(usable_visits, 0) into v_usable from account_balances where visit_account_id = p_visit_account_id;
  return v_usable;
end;
$$;

revoke execute on function
  begin_refund(uuid, uuid, integer, integer, text, text, uuid),
  finish_refund(uuid, text),
  fail_refund(uuid, text),
  adjust_visits(uuid, uuid, integer, text, uuid)
from public, anon, authenticated;
grant execute on function
  begin_refund(uuid, uuid, integer, integer, text, text, uuid),
  finish_refund(uuid, text),
  fail_refund(uuid, text),
  adjust_visits(uuid, uuid, integer, text, uuid)
to service_role;
