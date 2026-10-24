-- "Remember this device for 30 days". One row per signed-in session (Supabase's session_id
-- claim), saying whether the person ticked "remember" when they entered their two-step code.
-- The server reads it on every staff request: remembered sessions last 30 days after the
-- code, others 12 hours. It never skips the code itself; the database still requires aal2.
-- Server-only.

create table session_trust (
  session_id uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  remember   boolean not null,
  created_at timestamptz not null default now()
);

create index session_trust_user_idx on session_trust (user_id);

alter table session_trust enable row level security;
revoke all on session_trust from anon, authenticated;
grant delete, insert, references, select, trigger, truncate, update on session_trust to service_role;
