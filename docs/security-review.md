# Security self-review (Nov 7, 2026)

Our own review before the independent one. Not a substitute for it.

## What was checked, and the result
| Area | Result |
|---|---|
| Every server action and route checks who's asking (`require*`, Stripe signature, or an unguessable token) | OK |
| IDs from the browser (client, purchase, card, package, member, invite, ledger row) are matched to the business before use | OK |
| Public pages: purchase page (key check, closed businesses hidden), thank-you (Stripe session id), pass page (64-char token, 404 otherwise), kiosk (staff sign-in) | OK |
| Signed-out visitors on staff pages: redirect to `/login`, no data in the page (checked on the live site) | OK |
| Database: every business function revoked from browser roles; the two left open (`is_provider_admin`, `is_two_step_verified`) only answer about the caller | OK |
| Search boxes: characters limited before they reach the database filter | OK |
| Emails: every value HTML-escaped; sender names stripped of quotes/newlines | OK |
| Redirects after email links are fixed (no `?next=`), so they can't send people elsewhere | OK |
| Secrets: none in the code or git history; only the Supabase URL and publishable key are public | OK |
| Headers on the live site: CSP frame/form rules, X-Frame-Options, HSTS, nosniff, Referrer-Policy, Permissions-Policy | OK |
| Dependencies: `npm audit` 0 known vulnerabilities | OK |

## Fixed in this review
- **6-digit code guessing.** Someone who already had a password could keep trying authenticator codes
  (only Supabase's general limit applied). Now 10 tries per 15 minutes per account, at sign-in and on the
  reset-password page (`twoStepCodePerUser`).
- **Sign-up flooding.** Sign-up now has a per-IP limit (10 an hour), like sign-in.

## Known, accepted for now (for the outside reviewer)
- No script Content-Security-Policy yet (Next.js inline scripts need nonces). Revisit at the AWS move.
- Passkey sign-in counts as two-step; the remaining risk is in `docs/passkey-signin-plan.md`.
- Rate limits trust the host's `x-forwarded-for` (Vercel sets it). Re-check on AWS.
- Pass links are bearer links: anyone with the link or QR can use the visits (said in the pass email).

## Next
Independent security review before real client data (CLAUDE.md hard rule 7).
