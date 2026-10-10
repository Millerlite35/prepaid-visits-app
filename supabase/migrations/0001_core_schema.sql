-- Core schema
-- Design rules:
--   * Collect as little personal data as possible (name + email only for clients).
--   * QR codes carry only a random token, never a name or health detail.
--   * Visit balances are NEVER edited directly. Every change is a row in visit_ledger,
--     so there is a complete audit trail and "undo" is just another row.
--   * One visit account per client. New packages top up the same account.

-- ------------------------------------------------------------------
-- Providers (the paying customers)
-- ------------------------------------------------------------------
create table providers (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique
                            check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  display_name            text not null,
  logo_path               text,
  brand_color             text not null default '#1B4D3E'
                            check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  -- configurable vocabulary so the same product serves clinics, studios, trades
  vocab_singular          text not null default 'visit',
  vocab_plural            text not null default 'visits',
  pass_label              text not null default 'Visit card',   -- neutral label shown on passes
  profession_template     text,
  timezone                text not null default 'America/New_York',
  -- purchase page access: private pages need the secret key in the link
  page_access             text not null default 'private'
                            check (page_access in ('private','public')),
  private_access_key      text not null
                            default replace(gen_random_uuid()::text, '-', ''),
  -- Stripe Connect (money goes straight to the provider)
  stripe_account_id       text unique,
  stripe_charges_enabled  boolean not null default false,
  -- terms shown and accepted at checkout
  terms_version           integer not null default 1,
  terms_text              text not null default '',
  created_at              timestamptz not null default now()
);

-- Who can sign in for a provider. scan_only staff can check people in but
-- cannot see revenue, issue refunds, or edit packages.
create table provider_members (
  provider_id  uuid not null references providers(id) on delete cascade,
  user_id      uuid not null,               -- auth.users id (Supabase Auth)
  role         text not null check (role in ('owner','manager','scan_only')),
  created_at   timestamptz not null default now(),
  primary key (provider_id, user_id)
);
create index provider_members_user_idx on provider_members (user_id);

-- ------------------------------------------------------------------
-- Package templates (what a provider offers for sale)
-- ------------------------------------------------------------------
create table package_templates (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references providers(id) on delete cascade,
  name         text not null,
  description  text,
  visits       integer not null check (visits > 0),
  price_cents  integer not null check (price_cents >= 0),
  currency     text not null default 'usd',
  expires_days integer check (expires_days is null or expires_days > 0),  -- null = never
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index package_templates_provider_idx on package_templates (provider_id, active, sort_order);

-- ------------------------------------------------------------------
-- Clients and their single visit account
-- ------------------------------------------------------------------
create table clients (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references providers(id) on delete cascade,
  full_name    text not null,
  email        text not null,
  created_at   timestamptz not null default now()
);
create unique index clients_provider_email_uidx on clients (provider_id, lower(email));

create table visit_accounts (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references providers(id) on delete cascade,
  client_id    uuid not null unique references clients(id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index visit_accounts_provider_idx on visit_accounts (provider_id);

-- ------------------------------------------------------------------
-- Credentials: what the QR code points to. Wallet passes and physical
-- cards both live here. A lost card is revoked and a new one issued.
-- Pre-printed cards start 'unassigned' and link to a client on first use.
-- ------------------------------------------------------------------
create table credentials (
  id               uuid primary key default gen_random_uuid(),
  provider_id      uuid not null references providers(id) on delete cascade,
  visit_account_id uuid references visit_accounts(id) on delete cascade,
  token            text not null unique
                     default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  kind             text not null check (kind in ('wallet','card','key_tag')),
  status           text not null default 'active'
                     check (status in ('unassigned','active','revoked')),
  apple_serial     text unique,       -- Apple Wallet pass serial number
  google_object_id text unique,       -- Google Wallet object id
  issued_at        timestamptz not null default now(),
  linked_at        timestamptz,
  revoked_at       timestamptz,
  check ( (status = 'unassigned') = (visit_account_id is null) or status = 'revoked' )
);
create index credentials_account_idx on credentials (visit_account_id);
create index credentials_provider_status_idx on credentials (provider_id, status);

-- ------------------------------------------------------------------
-- Purchases (money in)
-- ------------------------------------------------------------------
create table purchases (
  id                         uuid primary key default gen_random_uuid(),
  provider_id                uuid not null references providers(id) on delete cascade,
  visit_account_id           uuid not null references visit_accounts(id) on delete cascade,
  package_template_id        uuid references package_templates(id) on delete set null,
  -- snapshots, so later edits to the template never change a past sale
  package_name               text not null,
  visits_purchased           integer not null check (visits_purchased > 0),
  price_cents                integer not null check (price_cents >= 0),
  currency                   text not null default 'usd',
  expires_days               integer,
  status                     text not null default 'pending'
                               check (status in ('pending','paid','refunded','partially_refunded','failed')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id   text,
  terms_version              integer not null,
  terms_accepted_at          timestamptz not null,
  created_at                 timestamptz not null default now(),
  paid_at                    timestamptz,
  expires_at                 timestamptz
);
create index purchases_account_idx on purchases (visit_account_id, status);
create index purchases_provider_idx on purchases (provider_id, created_at desc);

-- ------------------------------------------------------------------
-- The visit ledger: the single source of truth for balances
-- ------------------------------------------------------------------
create table visit_ledger (
  id               bigint generated always as identity primary key,
  provider_id      uuid not null references providers(id) on delete cascade,
  visit_account_id uuid not null references visit_accounts(id) on delete cascade,
  purchase_id      uuid references purchases(id) on delete set null,
  kind             text not null
                     check (kind in ('grant','deduct','undo','adjust','expire','refund')),
  delta            integer not null check (delta <> 0),
  credential_id    uuid references credentials(id) on delete set null,
  performed_by     uuid,                          -- staff user who scanned or adjusted
  reverses_id      bigint references visit_ledger(id),
  note             text,
  created_at       timestamptz not null default now()
);
create index visit_ledger_account_idx on visit_ledger (visit_account_id, created_at desc);
create index visit_ledger_purchase_idx on visit_ledger (purchase_id);
-- a visit can be undone only once
create unique index visit_ledger_one_undo_uidx on visit_ledger (reverses_id) where reverses_id is not null;

-- Remaining visits per purchase, and per account (usable = not expired)
create view purchase_balances as
select p.id as purchase_id,
       p.provider_id,
       p.visit_account_id,
       p.package_name,
       p.expires_at,
       coalesce(sum(l.delta), 0)::int as remaining
from purchases p
left join visit_ledger l on l.purchase_id = p.id
where p.status in ('paid','partially_refunded')
group by p.id;

create view account_balances as
select a.id as visit_account_id,
       a.provider_id,
       coalesce(sum(b.remaining) filter (where b.expires_at is null or b.expires_at > now()), 0)::int
         as usable_visits,
       min(b.expires_at) filter (where b.remaining > 0 and (b.expires_at is null or b.expires_at > now()))
         as next_expiry
from visit_accounts a
left join purchase_balances b on b.visit_account_id = a.id
group by a.id;

-- ------------------------------------------------------------------
-- Apple Wallet live-update registrations (required by Apple's pass web service)
-- ------------------------------------------------------------------
create table apple_registrations (
  device_library_identifier text not null,
  pass_type_identifier      text not null,
  serial_number             text not null references credentials(apple_serial) on delete cascade,
  push_token                text not null,
  updated_at                timestamptz not null default now(),
  primary key (device_library_identifier, serial_number)
);

-- ------------------------------------------------------------------
-- Operations: Stripe webhook de-duplication and an audit trail
-- ------------------------------------------------------------------
create table stripe_events (
  id           text primary key,              -- Stripe event id
  type         text not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

create table audit_log (
  id          bigint generated always as identity primary key,
  provider_id uuid references providers(id) on delete set null,
  actor_id    uuid,
  action      text not null,
  entity      text,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_provider_idx on audit_log (provider_id, created_at desc);
