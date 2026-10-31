-- A passkey sign-in counts as two-step verification (docs/passkey-signin-plan.md, stage 2).
--
-- Migration 0004 hides all provider data from sessions that haven't passed two-step:
-- is_two_step_verified() is used by every table's RESTRICTIVE require_two_step policy.
-- Supabase's passkey sign-in is labelled aal1 (it has no way to mark it aal2 yet), with
-- "passkey" in the signed token's amr list (measured Oct 31, 2026). A passkey unlocked with
-- Face ID / fingerprint / PIN is two factors on its own (the device + the person), and the
-- app's server refuses passkey answers without that check before Supabase sees them.
--
-- Only the function changes; the policies, grants and the password-only rule stay as they
-- were: a password-only session (aal1, amr "password") still sees nothing.
-- The token is signed by Supabase, so amr can't be forged by a browser.

create or replace function is_two_step_verified()
returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
      or exists (
        select 1
        from jsonb_array_elements(
          case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end
        ) as entry
        -- amr entries are objects ({"method": "passkey", "timestamp": ...}); plain strings also accepted
        where coalesce(entry ->> 'method', entry #>> '{}') = 'passkey'
      );
$$;
