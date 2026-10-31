# Plan: sign in with a passkey alone (no password, no 6-digit code)

Status: **stage 1 built and tested on the live site (Oct 31, 2026); stage 2 waits for the founder's go-ahead.**
Measured: a Supabase passkey sign-in's token says `aal: "aal1"`, `amr: [{ method: "passkey" }]` (three sign-ins,
Vercel logs "passkey sign-in token:"). Stage 2 matches the `passkey` method.
For the independent security review: this changes the rule that protects all provider data.

## Why one passkey is enough
A passkey sign-in needs two things at once: the device that holds the passkey (something you
have) and Face ID, a fingerprint or the device PIN to unlock it (something you are or know).
NIST's digital identity guidance (SP 800-63B, rev. 4) accepts passkeys that check the person
("user verification") at the same level as password + code (AAL2). They also can't be phished:
a passkey only works on the real web address.

## The obstacle
- Supabase can't attach a passkey as the *second* step ("MFA WebAuthn"): its API answers
  "not currently supported". That route is built and switched off (`PASSKEYS_AVAILABLE`).
- Supabase's **Passkeys (Beta)** sign-in works, but labels the session `aal1` (first step only).
- Our database lets staff see provider data only when the login token says `aal2`
  (`is_two_step_verified()` in migration 0004, used by every table's restrictive policy). The app's
  `requireUser()` checks the same thing.

## The change, in two stages

### Stage 1: build passkey sign-in, change no rules (safe to ship)
1. **Server-side passkey API** (no browser Supabase client, cookies stay httpOnly): the server calls
   Supabase's `/passkeys/registration/*`, `/passkeys/authentication/*` and `/passkeys` endpoints;
   the browser only runs `navigator.credentials` (reuses `src/lib/passkey-browser.ts`).
2. **Security page**: "Add a passkey on this device", list, remove. Adding needs a full `aal2` sign-in.
   **Email alert** whenever a passkey is added or removed (like the backup-code alert).
3. **Sign-in page**: "Sign in with a passkey" button (no email typed: the phone offers the saved passkey).
4. **Measure, don't trust**: after a passkey sign-in, log the token's `aal` and `amr` claims (the
   method name Supabase records, e.g. `passkey`) to confirm what the database will see.
5. Until stage 2, a passkey sign-in still goes on to the 6-digit code page. Nothing gets weaker.

### Stage 2: count a verified passkey as two-step (the security change)
1. **Enforce user verification ourselves.** Before passing the browser's answer to Supabase, the
   server reads the authenticator data and **rejects it unless the "user verified" flag is set**
   (Face ID / fingerprint / PIN actually happened). A bare security key with no PIN won't count.
   Registration options also ask for `userVerification: "required"`.
2. **Migration 0020**: `is_two_step_verified()` becomes
   `aal = 'aal2'` **or** the signed token's `amr` list contains the passkey method. One function,
   so every table's policy follows; policies themselves are unchanged. Explicit grants unchanged.
3. **`requireUser()`** accepts the same two cases; **remember-device** (`session-trust.ts`) counts the
   passkey method's timestamp, so the 12-hour / 30-day limits apply to passkey sign-ins too.
4. **Recovery**: a backup code also deletes the person's passkeys (admin API), so a lost phone's
   passkey stops working. Password + authenticator code stays the way in on a new device.
5. **Password reset** keeps requiring the authenticator code (unchanged).

## Tests (each must pass before shipping stage 2)
- `access_rules_test.sql`: token `aal1` + amr `password` sees nothing (as today); `aal1` + amr passkey
  sees only its own business; `aal2` unchanged; a stranger with a passkey token sees nothing.
- A new `passkey_test.sql` for the function itself, ending with a PASSED row like the others.
- Server check: an answer without the user-verified flag is refused.
- End to end on the live site (phone): add passkey, sign out, sign in with Face ID only, dashboard
  loads; remove passkey, it no longer works; backup-code recovery removes passkeys.

## Limits and decisions
- **One web address per passkey.** Supabase is set to `prepaid-visits-app.vercel.app` (Passkeys page:
  relying party ID). Testing happens on the live site, not localhost. Moving to `app.visitbundle.com`
  means changing that setting and staff adding a new passkey (password + code still works).
- **Supabase's passkey sign-in is beta.** If it changes, sign-in falls back to password + code;
  data access never gets looser than today.
- **Shared front-desk devices**: a passkey on a shared tablet would let anyone at the desk in. Advise
  scan-only accounts there and no passkey (the setup screen will say so).
- Turn Supabase's **Passkeys (Beta)** back on (dashboard) at the start of stage 1.

## Size
Stage 1: about one session. Stage 2: about one session including tests. Lint, build and every SQL
test re-run after each stage; CLAUDE.md updated.
