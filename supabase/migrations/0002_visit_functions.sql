-- Business logic that must be atomic and correct.
-- These are called from the server (service role), never directly from a browser.

-- ------------------------------------------------------------------
-- mark_purchase_paid: called by the Stripe webhook. Safe to call twice.
-- ------------------------------------------------------------------
create or replace function mark_purchase_paid(p_purchase_id uuid, p_payment_intent text default null)
returns purchases
language plpgsql
as $$
declare
  v purchases;
begin
  select * into v from purchases where id = p_purchase_id for update;
  if not found then
    raise exception 'purchase % not found', p_purchase_id;
  end if;

  if v.status = 'paid' then
    return v;                                   -- already processed (webhook retry)
  end if;
  if v.status <> 'pending' then
    raise exception 'purchase % is %, cannot mark paid', p_purchase_id, v.status;
  end if;

  update purchases
     set status = 'paid',
         paid_at = now(),
         stripe_payment_intent_id = coalesce(p_payment_intent, stripe_payment_intent_id),
         expires_at = case when expires_days is null then null
                           else now() + make_interval(days => expires_days) end
   where id = p_purchase_id
   returning * into v;

  insert into visit_ledger (provider_id, visit_account_id, purchase_id, kind, delta, note)
  values (v.provider_id, v.visit_account_id, v.id, 'grant', v.visits_purchased, 'Package purchased');

  insert into audit_log (provider_id, action, entity, entity_id, metadata)
  values (v.provider_id, 'purchase.paid', 'purchase', v.id::text,
          jsonb_build_object('visits', v.visits_purchased, 'price_cents', v.price_cents));

  return v;
end;
$$;

-- ------------------------------------------------------------------
-- record_visit: the check-in. Scans a token and deducts one visit.
-- Returns a result code the scanner screen can show:
--   ok | unknown_code | unassigned | revoked | no_visits | expired | duplicate_recent
-- Visits are taken from the package that expires soonest.
-- p_force = true lets staff override the "scanned twice" warning.
-- ------------------------------------------------------------------
create or replace function record_visit(
  p_token       text,
  p_provider_id uuid,
  p_user_id     uuid default null,
  p_force       boolean default false
)
returns table (
  result       text,
  ledger_id    bigint,
  client_name  text,
  remaining    integer,
  next_expiry  timestamptz
)
language plpgsql
as $$
declare
  c            credentials;
  v_name       text;
  v_purchase   uuid;
  v_ledger     bigint;
  v_remaining  integer;
  v_expiry     timestamptz;
  v_any_left   boolean;
begin
  select * into c from credentials
   where token = p_token and provider_id = p_provider_id;

  if not found then
    return query select 'unknown_code'::text, null::bigint, null::text, null::int, null::timestamptz;
    return;
  end if;
  if c.status = 'revoked' then
    return query select 'revoked'::text, null::bigint, null::text, null::int, null::timestamptz;
    return;
  end if;
  if c.status = 'unassigned' then
    return query select 'unassigned'::text, null::bigint, null::text, null::int, null::timestamptz;
    return;
  end if;

  -- serialize all scans for this account so two phones can't double-spend a visit
  perform 1 from visit_accounts where id = c.visit_account_id for update;

  select cl.full_name into v_name
    from visit_accounts a join clients cl on cl.id = a.client_id
   where a.id = c.visit_account_id;

  -- duplicate-scan guard: a deduct in the last 2 minutes that was not undone
  if not p_force and exists (
    select 1 from visit_ledger d
     where d.visit_account_id = c.visit_account_id
       and d.kind = 'deduct'
       and d.created_at > now() - interval '2 minutes'
       and not exists (select 1 from visit_ledger u where u.reverses_id = d.id)
  ) then
    select ab.usable_visits, ab.next_expiry into v_remaining, v_expiry
      from account_balances ab where ab.visit_account_id = c.visit_account_id;
    return query select 'duplicate_recent'::text, null::bigint, v_name, v_remaining, v_expiry;
    return;
  end if;

  -- pick the soonest-expiring package that still has visits and is not expired
  select b.purchase_id into v_purchase
    from purchase_balances b
   where b.visit_account_id = c.visit_account_id
     and b.remaining > 0
     and (b.expires_at is null or b.expires_at > now())
   order by b.expires_at asc nulls last, b.purchase_id
   limit 1;

  if v_purchase is null then
    select exists (select 1 from purchase_balances b
                    where b.visit_account_id = c.visit_account_id and b.remaining > 0)
      into v_any_left;
    return query select (case when v_any_left then 'expired' else 'no_visits' end)::text,
                        null::bigint, v_name, 0, null::timestamptz;
    return;
  end if;

  insert into visit_ledger (provider_id, visit_account_id, purchase_id, kind, delta, credential_id, performed_by, note)
  values (p_provider_id, c.visit_account_id, v_purchase, 'deduct', -1, c.id, p_user_id, 'Check-in')
  returning id into v_ledger;

  select ab.usable_visits, ab.next_expiry into v_remaining, v_expiry
    from account_balances ab where ab.visit_account_id = c.visit_account_id;

  return query select 'ok'::text, v_ledger, v_name, v_remaining, v_expiry;
end;
$$;

-- ------------------------------------------------------------------
-- undo_visit: reverses one check-in (once). Returns the new balance.
-- ------------------------------------------------------------------
create or replace function undo_visit(p_ledger_id bigint, p_user_id uuid default null)
returns integer
language plpgsql
as $$
declare
  d visit_ledger;
  v_remaining integer;
begin
  select * into d from visit_ledger where id = p_ledger_id for update;
  if not found or d.kind <> 'deduct' then
    raise exception 'ledger entry % is not a check-in', p_ledger_id;
  end if;
  if exists (select 1 from visit_ledger where reverses_id = d.id) then
    raise exception 'check-in % was already undone', p_ledger_id;
  end if;

  insert into visit_ledger (provider_id, visit_account_id, purchase_id, kind, delta, credential_id, performed_by, reverses_id, note)
  values (d.provider_id, d.visit_account_id, d.purchase_id, 'undo', 1, d.credential_id, p_user_id, d.id, 'Check-in undone');

  select usable_visits into v_remaining from account_balances where visit_account_id = d.visit_account_id;
  return v_remaining;
end;
$$;

-- ------------------------------------------------------------------
-- Physical cards: create a batch of unassigned cards for printing,
-- then link one to a client the first time it is handed over.
-- ------------------------------------------------------------------
create or replace function create_card_batch(p_provider_id uuid, p_count integer, p_kind text default 'card')
returns table (credential_id uuid, token text)
language plpgsql
as $$
begin
  if p_count < 1 or p_count > 1000 then
    raise exception 'batch size must be between 1 and 1000';
  end if;
  if p_kind not in ('card','key_tag') then
    raise exception 'kind must be card or key_tag';
  end if;
  return query
    insert into credentials (provider_id, kind, status)
    select p_provider_id, p_kind, 'unassigned' from generate_series(1, p_count)
    returning id, credentials.token;
end;
$$;

create or replace function link_card(p_token text, p_provider_id uuid, p_visit_account_id uuid)
returns credentials
language plpgsql
as $$
declare
  c credentials;
begin
  select * into c from credentials
   where token = p_token and provider_id = p_provider_id for update;
  if not found then raise exception 'unknown card'; end if;
  if c.status <> 'unassigned' then raise exception 'card is already %', c.status; end if;
  if not exists (select 1 from visit_accounts where id = p_visit_account_id and provider_id = p_provider_id) then
    raise exception 'visit account does not belong to this provider';
  end if;

  update credentials
     set status = 'active', visit_account_id = p_visit_account_id, linked_at = now()
   where id = c.id
   returning * into c;
  return c;
end;
$$;

-- Lost card: revoke it. The server then issues a fresh credential.
create or replace function revoke_credential(p_credential_id uuid, p_provider_id uuid)
returns void
language sql
as $$
  update credentials
     set status = 'revoked', revoked_at = now()
   where id = p_credential_id and provider_id = p_provider_id and status <> 'revoked';
$$;

-- ------------------------------------------------------------------
-- expire_purchases: run once a day (scheduled job). Writes an 'expire' ledger
-- row for any visits left on a package past its expiry date. Safe to re-run.
-- ------------------------------------------------------------------
create or replace function expire_purchases()
returns integer
language plpgsql
as $$
declare
  n integer := 0;
  r record;
begin
  for r in
    select b.purchase_id, b.provider_id, b.visit_account_id, b.remaining
      from purchase_balances b
     where b.expires_at is not null and b.expires_at <= now() and b.remaining > 0
  loop
    insert into visit_ledger (provider_id, visit_account_id, purchase_id, kind, delta, note)
    values (r.provider_id, r.visit_account_id, r.purchase_id, 'expire', -r.remaining, 'Package expired');
    n := n + 1;
  end loop;
  return n;
end;
$$;
