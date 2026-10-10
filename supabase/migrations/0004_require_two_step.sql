-- Two-step verification, enforced by the database itself.
-- A signed-in user only sees provider data once their session has passed the
-- authenticator-app code ("aal2"). A password-only session ("aal1") sees nothing,
-- even if someone skips the app and calls the database API directly.
--
-- These are RESTRICTIVE policies: they are AND-ed with every existing policy,
-- so they can only take access away, never grant it.
-- The server's secret key (service role) bypasses row-level security as before.

create or replace function is_two_step_verified()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create policy require_two_step on providers         as restrictive for all to authenticated using (is_two_step_verified());
create policy require_two_step on provider_members  as restrictive for all to authenticated using (is_two_step_verified());
create policy require_two_step on package_templates as restrictive for all to authenticated using (is_two_step_verified());
create policy require_two_step on clients           as restrictive for all to authenticated using (is_two_step_verified());
create policy require_two_step on visit_accounts    as restrictive for all to authenticated using (is_two_step_verified());
create policy require_two_step on credentials       as restrictive for all to authenticated using (is_two_step_verified());
create policy require_two_step on purchases         as restrictive for all to authenticated using (is_two_step_verified());
create policy require_two_step on visit_ledger      as restrictive for all to authenticated using (is_two_step_verified());
create policy require_two_step on audit_log         as restrictive for all to authenticated using (is_two_step_verified());
