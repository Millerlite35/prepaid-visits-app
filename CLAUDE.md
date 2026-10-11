# Visit Pack (placeholder name): project brief for Claude

Read this first in every session. Keep it updated as decisions change.

## What we are building
A cloud service where independent, fee-for-service providers (clinicians, yoga/pilates
instructors, trainers, coaches, and similar) sell discounted prepaid visit packages.
- Each provider gets a branded public/private purchase page.
- Clients pay through Stripe, then get an Apple/Google Wallet pass (QR) by email, and
  optionally a physical QR card or key tag.
- The provider scans the pass at each visit (mobile web app first, store app later).
- Full business plan: see the Google Doc "Visit Pack Business Plan (Draft v4)".

## Who is building
One non-outsourced founder working with Claude. Prefer simple, boring, well-documented
tools. Explain choices in plain language. Always keep outside help to a minimum (only a
healthcare attorney and an independent security review).

## Hard rules (do not break these)
1. **Minimal data.** Clients: full name + email only. No phone, DOB, address, or health info.
2. **QR codes hold only the random token** from `credentials.token`. Never a name or ID.
3. **Balances come only from `visit_ledger`.** Never write a balance number anywhere.
   Every change is a ledger row. Undo is a new row.
4. **Money never touches our accounts.** Stripe Connect sends funds to the provider.
5. **Check-in goes through `record_visit()`** (atomic, locks the account). Do not
   re-implement deduction logic in app code.
6. **Browsers never read tables directly for clients.** The public page and scanner talk
   to the server; the server uses the service role after its own checks.
7. **No real client data until:** a BAA-eligible host/database plan is in place and the
   attorney has reviewed terms. Until then, test mode and fake data only.
8. Neutral pass labels (e.g. "Wellness visit card"). Nothing about diagnosis or specialty.
9. Secrets (Stripe keys, service role key, Apple certificates) live in environment
   variables only. Never commit them.
10. **The product name is a placeholder.** Name, tagline and brand colors live only in
    `src/config/brand.ts`. Import `brand` everywhere (page text, titles, emails, passes).
    Never hardcode the name in code, the database or seed data. Name folders, files,
    tables and variables generically ("app", "provider", "package"), not after the product.

## Stack (default choices, change only with a reason)
- Next.js (TypeScript) web app, mobile-friendly, installable to the home screen
- Supabase: Postgres + Auth (email login with two-step verification)
- Stripe Connect + Stripe Checkout, tested in test mode first (account style is an
  open decision, see Payments)
- Wallet passes: Apple PassKit (signed .pkpass + update web service) and Google Wallet API
- Transactional email service (no health details in email bodies)
- Hosting: decide before pilot; must offer a BAA on the chosen plan (verify, don't assume)

## Database (done: build step 1)
Files in `supabase/migrations/`, run in order:
1. `0001_core_schema.sql`: providers, members, package templates, clients, visit
   accounts, credentials (wallet/card/key tag), purchases, visit ledger, balance views,
   Apple registrations, Stripe event log, audit log
2. `0002_visit_functions.sql`: `mark_purchase_paid`, `record_visit`, `undo_visit`,
   `create_card_batch`, `link_card`, `revoke_credential`, `expire_purchases`
3. `0003_access_rules.sql`: row-level security
4. `0004_require_two_step.sql`: restrictive RLS policies, so signed-in users see provider
   data only after two-step verification (`aal2` in their login token)
5. `0005_create_provider.sql`: `create_provider` (business + owner + audit row, atomic),
   and locks all business functions to the server (revoke from public/anon/authenticated)
6. `0006_page_settings.sql`: `provider_terms` history (triggers bump `terms_version` and
   save each version; read-only to owners), and column-level grants so signed-in owners
   may update only settings columns on `providers` (never Stripe fields or versions)
7. `0007_checkout.sql`: `complete_checkout` records a paid Checkout session atomically
   (client + account created on first purchase, purchase, `mark_purchase_paid`, wallet
   credential, audit row); idempotent per session id
8. `0008_logos.sql`: public-read Storage bucket `provider-logos` (PNG/JPG/WebP, 1 MB, no
   write policies: only the server uploads, after `requireOwner`)
9. `0009_view_security_and_pass_reissue.sql`: **security fix**, balance views set to
   `security_invoker` (they were readable with the public key, bypassing RLS); and
   `reissue_wallet_pass` (cancel the active pass + issue a new one, atomic)

**Every new view** must be created `with (security_invoker = true)` (or altered so), and
covered by an anon/stranger check in a test. Postgres views otherwise bypass RLS.
Then `supabase/seed.sql` (fake demo provider). Tests (each ends with a PASSED result row):
`visit_logic_test.sql`, `access_rules_test.sql`, `provider_setup_test.sql`,
`page_settings_test.sql`, `checkout_test.sql`, `clients_test.sql` in `supabase/tests/`.
Re-run all after any schema change.
**New settings columns on providers** must be added to the `grant update (...)` list.

**Every new business function** needs `revoke execute ... from public, anon, authenticated`
and `grant execute ... to service_role` (Supabase makes functions browser-callable by
default), plus a privilege check in `provider_setup_test.sql`.

`record_visit` result codes the scanner must handle:
`ok | unknown_code | unassigned | revoked | no_visits | expired | duplicate_recent`

## App (build step 2: local part done; hosting still open)
- Next.js 16 (App Router, TypeScript, Tailwind) in `src/`. Next 16 differs from older
  versions: read `node_modules/next/dist/docs/` before using an unfamiliar API (see AGENTS.md).
- **Cache Components is on** (`next.config.ts`). Anything that reads live data must call
  `await connection()` (or cookies/headers) and sit inside `<Suspense>`, or it gets cached.
- Settings: `.env.example` lists them; real values go in `.env.local` (git-ignored).
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- Database access from the server: `getAdminClient()` in `src/lib/supabase/admin.ts`
  (secret key, bypasses RLS, marked `server-only`). Read settings with `requireEnv()`.
- `src/app/page.tsx` is a temporary system check page (server connection + proof the
  browser key cannot read providers). Replace it when the real home page exists.
- Check: `npm run lint` and `npm run build` must both pass.

## Provider login (build step 3: 3a login, 3b two-step, 3c onboarding)
- Supabase Auth, email + password (min 12 chars), email confirmation on.
  Supabase dashboard > Authentication > URL Configuration must allow `SITE_URL/**`.
- Two-step verification (authenticator app, TOTP) is required for ALL staff.
  Enforced twice: `requireUser()` redirects to `/mfa/setup` or `/mfa/verify`, and
  migration 0004 makes the database hide provider data from password-only sessions.
- `src/proxy.ts` (Next 16's name for middleware) only refreshes the session cookie.
  It does NOT protect pages.
- Protect every page, server action and route handler with `requireUser()` from
  `src/lib/auth.ts` (requires two-step). `requireSignedIn()` (password only) is for the
  `/mfa/*` pages alone. Read staff data with `createSessionClient()` from
  `src/lib/supabase/server.ts`, which acts as the signed-in user so RLS applies.
- Routes: `/signup`, `/login` (forms + actions in `src/app/(auth)/`), `/auth/callback`
  (email link, fixed redirect to /dashboard), `/auth/error`, `/dashboard`,
  `/dashboard/new-business` (onboarding; calls `create_provider` with the verified user id).
- Provider purchase pages will live at `/{slug}`. `src/lib/slug.ts` has the slug rules
  (must match the DB check) and a RESERVED list: **add every new top-level route to it.**

## Roadmap pointers (matches plan Section "Build steps")
1 data model (done) -> 2 project (done) + hosting (open) -> 3 provider login/security (done) -> 4 Stripe Connect
(done) -> 5 provider page builder (done) -> 6 purchase flow + email (done) -> 7 wallet passes
(deferred: needs the $99 Apple Developer account and the final name) -> 8 scanner web app
(done) -> 9 dashboard -> 10 flyer generator -> 11 testing/security -> 12 pilot -> 13 physical cards
-> 14 store app.

## Payments (build step 4: 4a Connect onboarding done; checkout comes in step 6)
- Settings in `src/config/payments.ts`: `connectAccountStyle` ("full" = provider's own
  full Stripe account, Stripe liable for losses; "express" = lighter, WE are liable) and
  `platformFeePercent` (1%). Stripe client: `getStripe()` in `src/lib/stripe.ts`
  (refuses live keys unless `ALLOW_LIVE_PAYMENTS=true`).
- `src/lib/payments/connect.ts`: creates the connected account with **Accounts v2**
  (`stripe.v2.core.accounts`; Stripe refuses v1 account creation for new platforms),
  idempotent per provider, merchant configuration for direct charges; v2 onboarding
  links; syncs `stripe_charges_enabled` from `configuration.merchant.capabilities.
  card_payments.status`. Owner-only: guard with `requireOwner(providerId)`.
- Development uses a Stripe **sandbox** (Connect setup in plain test mode required
  live-mode steps). `STRIPE_SECRET_KEY` is the sandbox's `sk_test_` key.
- Routes: dashboard "Connect Stripe" (server action), `/dashboard/stripe/return`,
  `/dashboard/stripe/refresh`, `/dashboard/stripe/problem`. Status syncs on return;
  an `account.updated` webhook comes with the payment webhooks in step 6.

## Provider setup (build step 5: 5a packages, 5b page settings + terms)
- `/dashboard/business/[providerId]/settings`, OWNER only (`requireOwner`; the DB's
  `providers_update` policy is owner-only too): name, profession preset (fills wording +
  pass label), vocab, neutral pass label (`passLabelProblem` keyword check, hard rule 8),
  brand colour (contrast warning), time zone, slug, public/private, private link
  (`/{slug}?key=...`, regenerable), terms (starter template, not legal advice; each save
  is a new version). Rules in `src/lib/page-settings.ts`.
- Clients can't buy while `terms_text` is empty or Stripe isn't ready (`notSellingReason`).
- Logos: upload in Page settings (`src/lib/logos.ts` checks the real file bytes; SVG is
  refused because it can carry scripts; new random file name each upload; old file
  deleted). `logoUrl()` in `src/lib/branding.ts`; shown via `<ProviderHeader>`
  (`src/components/provider-header.tsx`) on the purchase, thank-you and pass pages, and
  in the pass email. Server Action body limit raised to 2 MB in `next.config.ts`.

## Purchase flow (build step 6: 6a checkout, 6b pass email)
- Public purchase page `/{slug}` (`?key=` for private pages; wrong key = not found).
  Server reads with the admin client after its own checks (`src/lib/payments/checkout.ts`).
  Client gives full name + email only and accepts the current terms version.
- Stripe Checkout as a **direct charge on the provider's connected account** with
  `application_fee_amount` = `platformFeePercent`. Name/email/package snapshot travel in
  the session metadata; **nothing about the client is stored until paid**.
- Visits are granted ONLY by the webhook `/api/stripe/webhook` (signature-verified,
  de-duplicated via `stripe_events`, `checkout.session.completed` on a connected account
  that must match the provider) calling `complete_checkout`.
- `/{slug}/thanks?session_id=` confirms with Stripe, waits for the webhook, links the pass.
- Pass page `/pass/{token}`: QR (token only, hard rule 2) + visits left; no client name or
  email. Helpers in `src/lib/passes.ts`.
- Pass email via Resend (`src/lib/email.ts`, `src/lib/pass-email.ts`): sent once per new
  purchase (idempotency key), QR inline (`cid:`), no health details; failures are logged
  to `audit_log` and never undo the purchase. Test sender `onboarding@resend.dev` only
  delivers to the Resend account's own email until a domain is verified.
- Local webhooks: `npm.cmd run stripe:listen` (script `scripts/stripe-listen.ps1` uses the
  sandbox key from `.env.local`, saves `STRIPE_WEBHOOK_SECRET`, forwards Connect events).
  The Stripe CLI login is NOT used (it was linked to a provider account by mistake).
- In PowerShell, `npm` is blocked by the execution policy on this machine: use `npm.cmd`.
- `/dashboard/business/[providerId]/packages` (+ `/[packageId]` to edit), owners and
  managers only (`requireManager`). Writes go through `createSessionClient()` so RLS
  (`templates_all` + two-step) also enforces access; no admin client needed.
- Quick start presets live in `src/config/package-presets.ts` (priced from the
  provider's usual per-visit price minus a discount). Shared rules, money parsing and
  formatting in `src/lib/packages.ts` (limits: 1-100 visits, $1-$10,000, expiry 1-3650
  days or never).
- Packages with sales can't be deleted, only paused (`active = false`). Purchases keep
  their own snapshot, so edits never change past sales.
- UI uses the provider's `vocab_singular` / `vocab_plural` ("visit"/"class"), never a
  hardcoded word.

## Scanner (build step 8)
- `/dashboard/business/[providerId]/scan`, ALL staff incl. scan_only (`requireStaff`).
  Camera (native `BarcodeDetector` where available, else the `barcode-detector` ponyfill
  with its zxing `.wasm` self-hosted at `/vendor/zxing_reader-<version>.wasm`, copied by
  `scripts/copy-scanner-wasm.mjs` on predev/prebuild; `public/vendor` is git-ignored),
  USB scanner / typed code (a pasted pass link also works).
- Server actions call `record_visit` / `undo_visit` with the admin client after the staff
  check; every result code has its own screen. scan_only can undo within 15 minutes;
  owners/managers any time. Beep + vibration feedback.
- Camera needs a secure origin: works on `localhost`, NOT on `http://<LAN-ip>` from a
  phone. Phone camera testing needs https (hosting, or a tunnel).
- Dashboard shows scan-only staff the business name via a server-side lookup (RLS hides
  provider rows from them), and has "View purchase page" links.

## Provider dashboard (build step 9: 9a clients done; 9b refunds/adjust, 9c staff, 9d overview)
- `/dashboard/business/[providerId]/clients` (search by name/email, visits left, next
  expiry, last check-in) and `/clients/[clientId]` (balance, purchases with accepted
  terms version, full ledger history, pass actions). Owners + managers (`requireManager`).
  Reads use `createSessionClient()` (RLS); pass actions use the admin client after checks.
- Resend pass email (same pass; at most once a minute) and "Cancel pass and send a new
  one" (`reissue_wallet_pass`, then a "reissue" email). `sendPassEmail(purchaseId,
  credentialId, kind, actorId)` with kind `purchase | resend | reissue`.

## Open decisions
- Email provider for real clients: Resend (testing) has no advertised BAA. Decide with the
  hosting/BAA decision; a verified sending domain is needed either way.
- Resending a pass email / rate limits on repeat purchases: not built yet (steps 9, 11).
- Stripe account style (who is liable for chargebacks/negative balances): testing with
  "full"; decide with the attorney before pilot. One setting in `src/config/payments.ts`.
- Lost authenticator phone: no self-service recovery yet. For now, delete the user's
  factor in the Supabase dashboard (Authentication > Users). Decide before pilot.
- Shared front-desk devices for scan_only staff: two-step may need a different approach.
- Final product name (placeholder: Visit Pack). Needed before Apple pass setup and the
  Stripe platform name.
- Hosting provider with BAA.
- Which profession to market to first.

## Working style
- Make small, testable steps. After each step, say what to run to check it works.
- Ask before adding dependencies or services that cost money.
- Keep the data model and this file in sync.
- After each commit, push to GitHub (`git push`; private repo
  github.com/Millerlite35/prepaid-visits-app, branch `main`).
