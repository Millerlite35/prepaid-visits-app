-- Page settings support:
--   1. A permanent history of every version of each provider's terms, so we can always
--      show exactly what a client agreed to (purchases store terms_version).
--   2. Owners may only edit settings columns on providers, never Stripe or version fields.

-- ------------------------------------------------------------------
-- 1. Terms history
-- ------------------------------------------------------------------
create table provider_terms (
  provider_id uuid not null references providers(id) on delete cascade,
  version     integer not null,
  terms_text  text not null,
  created_at  timestamptz not null default now(),
  primary key (provider_id, version)
);

alter table provider_terms enable row level security;
create policy terms_read on provider_terms for select using (is_provider_admin(provider_id));
create policy require_two_step on provider_terms as restrictive for all to authenticated using (is_two_step_verified());
-- no insert/update/delete policies: history is written only by the triggers below

-- existing providers start with their current terms as version 1 (or whatever they have)
insert into provider_terms (provider_id, version, terms_text)
select id, terms_version, terms_text from providers
on conflict do nothing;

-- Changing terms_text bumps terms_version. The version can't be set by hand.
create or replace function bump_terms_version()
returns trigger
language plpgsql
as $$
begin
  if new.terms_text is distinct from old.terms_text then
    new.terms_version := old.terms_version + 1;
  else
    new.terms_version := old.terms_version;
  end if;
  return new;
end;
$$;

create trigger providers_bump_terms_version
  before update on providers
  for each row execute function bump_terms_version();

-- Save each new version into the history (runs as owner so signed-in users need no
-- write access to provider_terms).
create or replace function save_terms_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.terms_version <> old.terms_version then
    insert into provider_terms (provider_id, version, terms_text)
    values (new.id, new.terms_version, new.terms_text)
    on conflict (provider_id, version) do nothing;
  end if;
  return null;
end;
$$;

create trigger providers_save_terms_version
  after insert or update on providers
  for each row execute function save_terms_version();

revoke execute on function bump_terms_version(), save_terms_version() from public, anon, authenticated;

-- ------------------------------------------------------------------
-- 2. Which provider columns signed-in owners may change
-- Row-level security already limits updates to the owner's own business (with two-step);
-- this limits WHICH columns. Stripe fields, ids and terms_version are server-only.
-- ------------------------------------------------------------------
revoke insert, update, delete on providers from anon, authenticated;
grant update (
  slug, display_name, logo_path, brand_color, vocab_singular, vocab_plural, pass_label,
  profession_template, timezone, page_access, private_access_key, terms_text
) on providers to authenticated;
