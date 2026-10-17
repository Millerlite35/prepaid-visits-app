# Setup checklist (about 45 minutes, no coding)

Use FAKE data only until the legal and hosting steps in the plan are done.

## A. Accounts to create (all have free tiers for testing)
1. **GitHub** (github.com): holds the code. Create a private repository with a generic name such as
   `prepaid-visits-app` (not the placeholder product name).
2. **Supabase** (supabase.com): the database and login. Create a project named
   `visit-pack-dev`. Save the database password somewhere safe.
3. **Stripe** (stripe.com): sign up and stay in **Test mode**. Later, enable Connect.
4. **Claude Code**: install the desktop app or CLI from claude.com so Claude can work
   directly in your project folder.

Do not buy a domain, Apple Developer account, or paid hosting yet.

## B. Load the database (Supabase dashboard)
1. Open your project, then **SQL Editor** > **New query**.
2. Paste the contents of `supabase/migrations/0001_core_schema.sql`. Click **Run**.
3. Repeat for `0002_visit_functions.sql`, `0003_access_rules.sql`,
   `0004_require_two_step.sql`, `0005_create_provider.sql`, `0006_page_settings.sql`,
   `0007_checkout.sql`, `0008_logos.sql`, `0009_view_security_and_pass_reissue.sql`,
   `0010_refunds_and_adjustments.sql`, `0011_staff.sql`, `0012_external_refunds.sql`,
   then `supabase/seed.sql`.
4. Paste and run `supabase/tests/visit_logic_test.sql`. The Results panel should show one
   row: **ALL VISIT LOGIC TESTS PASSED**. A red error means a check failed. (It rolls
   back, so no test data remains.)
5. Do the same with `supabase/tests/access_rules_test.sql`. Expect one row:
   **ALL ACCESS RULE TESTS PASSED**.
6. And `supabase/tests/provider_setup_test.sql`. Expect **ALL PROVIDER SETUP TESTS PASSED**.
7. And `supabase/tests/page_settings_test.sql`. Expect **ALL PAGE SETTINGS TESTS PASSED**.
8. And `supabase/tests/checkout_test.sql`. Expect **ALL CHECKOUT TESTS PASSED**.
9. And `supabase/tests/clients_test.sql`. Expect **ALL CLIENTS TESTS PASSED**.
10. And `supabase/tests/refunds_test.sql`. Expect **ALL REFUND TESTS PASSED**.
11. And `supabase/tests/staff_test.sql`. Expect **ALL STAFF TESTS PASSED**.
12. And `supabase/tests/external_refunds_test.sql`. Expect **ALL EXTERNAL REFUND TESTS PASSED**.

## E. Payments and email for local testing
1. **Stripe sandbox**: in Stripe, create a sandbox and set up Connect inside it (Platform,
   Business management software, Stripe-hosted onboarding, Stripe Dashboard). Put the
   sandbox's `sk_test_` secret key in `.env.local` as `STRIPE_SECRET_KEY`.
2. **Stripe CLI**: `winget install Stripe.StripeCli`, then `npm run stripe:listen`
   (no `stripe login` needed; the script saves `STRIPE_WEBHOOK_SECRET` for you).
3. **Resend**: sign up at resend.com, create an API key with Sending access, and put it in
   `.env.local` as `RESEND_API_KEY`. Keep `EMAIL_FROM_ADDRESS=onboarding@resend.dev` until
   you verify a domain (it only delivers to your Resend signup email).

## C. Start a Claude Code session in this folder
Open the `visit-pack-build` folder in Claude Code. Claude reads `CLAUDE.md`
automatically. First request to give it:
> "Do build step 2: scaffold the Next.js app, connect it to my Supabase project, and
> show me how to run it locally. Keep everything in test mode."

## D. Things to keep safe (never paste into chats or commit to GitHub)
- Supabase database password and **service role key**
- Stripe secret keys
- Apple pass certificates (later)
