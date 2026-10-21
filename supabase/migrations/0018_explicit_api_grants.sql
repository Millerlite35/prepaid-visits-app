-- Explicit Data API grants for every table and view in "public".
--
-- From October 30, 2026 Supabase no longer grants API access to new tables automatically,
-- so a FRESH project (production, a HIPAA project, a preview branch, `supabase db reset`)
-- replaying migrations 0001-0017 would end up with tables nobody can reach. This file
-- states the access exactly as it is in the tested dev project (read from
-- information_schema on 2026-10-21), so a fresh project matches it.
-- On the existing dev project it changes nothing (GRANT is idempotent).
-- New tables from now on carry their own grants in the migration that creates them.
--
-- How access works here (unchanged): row-level security decides which ROWS a role sees;
-- these grants decide which tables a role may touch at all.

-- ---------------------------------------------------------------- tables with RLS
-- (the long-standing Supabase defaults: all three API roles, RLS policies do the limiting)
grant delete, insert, references, select, trigger, truncate, update on table
  public.apple_registrations,
  public.audit_log,
  public.clients,
  public.credentials,
  public.package_templates,
  public.provider_members,
  public.provider_terms,
  public.purchases,
  public.refunds,
  public.staff_invites,
  public.stripe_events,
  public.visit_accounts,
  public.visit_ledger
to anon, authenticated, service_role;

-- ---------------------------------------------------------------- providers
-- browsers may read (RLS applies) but never insert/delete; owners may update only the
-- settings columns (see 0006, 0016, 0017); the server can do everything
grant delete, insert, references, select, trigger, truncate, update on table public.providers to service_role;
grant references, select, trigger, truncate on table public.providers to anon, authenticated;
grant update (
  brand_color, display_name, logo_path, office_address, office_phone, office_website, page_access,
  pass_label, private_access_key, profession_template, slug, terms_text, timezone, usual_price_cents,
  vocab_plural, vocab_singular
) on table public.providers to authenticated;

-- ---------------------------------------------------------------- balance views
-- security_invoker views (0009); signed-in staff and the server only, never anonymous
grant delete, insert, references, select, trigger, truncate, update on table
  public.account_balances,
  public.purchase_balances
to authenticated, service_role;

-- ---------------------------------------------------------------- server-only tables
grant delete, insert, references, select, trigger, truncate, update on table
  public.mfa_backup_codes,
  public.rate_limits,
  public.support_requests
to service_role;

-- ---------------------------------------------------------------- sequences
grant usage on sequence
  public.audit_log_id_seq,
  public.mfa_backup_codes_id_seq,
  public.visit_ledger_id_seq
to anon, authenticated, service_role;
