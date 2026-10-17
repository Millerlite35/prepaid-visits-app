-- Support requests from providers and staff (the "Contact support" form in Help).
-- Server-only: written and read by the server after it has checked who is signed in.
-- No row-level policies, so browsers can't read or write this table at all.
-- Messages may only contain what the person types; the form asks them not to include
-- client health details (hard rule 1).

create table support_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,                       -- auth.users id of the sender
  email       text not null,
  provider_id uuid references providers(id) on delete set null,
  topic       text not null check (topic in ('getting_started','payments','checkins','packages','account','bug','other')),
  message     text not null check (length(message) between 1 and 3000),
  page        text,                                -- where they were in the app
  status      text not null default 'open' check (status in ('open','answered','closed')),
  emailed     boolean not null default false,      -- did the notification email go out
  created_at  timestamptz not null default now()
);
create index support_requests_user_idx on support_requests (user_id, created_at desc);

alter table support_requests enable row level security;
revoke all on support_requests from anon, authenticated;
