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

## Stack (default choices, change only with a reason)
- Next.js (TypeScript) web app, mobile-friendly, installable to the home screen
- Supabase: Postgres + Auth (email login with two-step verification)
- Stripe Connect (Express accounts) + Stripe Checkout, tested in test mode first
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
Then `supabase/seed.sql` (fake demo provider) and `supabase/tests/visit_logic_test.sql`
(must print ALL VISIT LOGIC TESTS PASSED). Re-run tests after any schema change.

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

## Roadmap pointers (matches plan Section "Build steps")
1 data model (done) -> 2 project (done) + hosting (open) -> 3 provider login/security -> 4 Stripe Connect
-> 5 provider page builder -> 6 purchase flow + email -> 7 wallet passes -> 8 scanner web app
-> 9 dashboard -> 10 flyer generator -> 11 testing/security -> 12 pilot -> 13 physical cards
-> 14 store app.

## Open decisions
- Final product name (placeholder: Visit Pack). Needed before Apple pass setup and the
  Stripe platform name.
- Hosting provider with BAA.
- Which profession to market to first.

## Working style
- Make small, testable steps. After each step, say what to run to check it works.
- Ask before adding dependencies or services that cost money.
- Keep the data model and this file in sync.
