# Test hosting on Vercel (fake data only)

Setup A from `docs/hosting-options.md`: free Vercel Hobby plus the current free Supabase project.
It gives the app a real https address so phones can test the camera scanner, the bottom bar,
pass emails and "Add to Home Screen". **Fake data only** (hard rule 7). Vercel Hobby is for
non-commercial use, so move to Pro (or the BAA setup) before the pilot.

Use the business account (shadowmodeco@gmail.com) for every sign-up.

## 1. You do (about 10 minutes, needs your logins)
1. Go to vercel.com and sign up with **Continue with GitHub**, using the GitHub account that
   owns `Millerlite35/prepaid-visits-app`. Choose the Hobby plan.
2. **Add New > Project**, pick `prepaid-visits-app`, allow Vercel to read that one repository.
3. Before clicking Deploy, open **Environment Variables** and add these. Copy the values from
   your `.env.local`, except where noted:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | same as `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same as `.env.local` |
   | `SUPABASE_SECRET_KEY` | same as `.env.local` (secret) |
   | `STRIPE_SECRET_KEY` | same sandbox `sk_test_` key (secret) |
   | `RESEND_API_KEY` | same as `.env.local` (secret) |
   | `EMAIL_FROM_ADDRESS` | `onboarding@resend.dev` |
   | `SUPPORT_EMAIL` | same as `.env.local` |
   | `SITE_URL` | leave for now (step 2) |
   | `STRIPE_WEBHOOK_SECRET` | leave for now (step 3) |

   Never add `ALLOW_LIVE_PAYMENTS`.
4. Click **Deploy**. When it finishes, copy the address it gives you
   (like `https://prepaid-visits-app.vercel.app`).

## 2. Point sign-in emails at the new address
1. Vercel > Project > Settings > Environment Variables: add `SITE_URL` = the address from step 1
   (no slash at the end). Then Deployments > the latest one > **Redeploy**.
2. Supabase dashboard > Authentication > URL Configuration: add `https://<your address>/**` to
   **Redirect URLs**. Keep `http://localhost:3000/**` too, so local testing still works.

## 3. Stripe webhook for the hosted app (sandbox)
The local `npm.cmd run stripe:listen` only reaches your computer. The hosted app needs its own:
1. Stripe dashboard, **in the sandbox** > Developers > Webhooks > **Add destination**.
2. Events from: **Connected accounts** (purchases happen on providers' own accounts).
3. Events: `checkout.session.completed`, `refund.created`, `refund.updated`, `refund.failed`,
   `charge.dispute.created`, `charge.dispute.closed`, `account.updated`.
4. Endpoint URL: `https://<your address>/api/stripe/webhook`.
5. Copy its signing secret (`whsec_...`) into Vercel as `STRIPE_WEBHOOK_SECRET`, then Redeploy.
   It's a different secret from the local one, so don't copy it into `.env.local`.

## 4. Check it works
- Open `https://<your address>/login` on your phone and sign in (password + code).
- Phone: the bottom bar shows, Scan opens the camera (allow it), Share > Add to Home Screen.
- Make a test purchase on a demo purchase page with card `4242 4242 4242 4242`; the pass email
  arrives (only to your Resend account email until a domain is verified) and opens on the phone.
- Every `git push` to `main` now redeploys automatically.

## Later, before the pilot
- Custom domain `app.visitbundle.com` (Vercel > Domains, then a CNAME in Cloudflare), then
  update `SITE_URL`, the Supabase redirect URL and the Stripe webhook URL to match.
- Confirm Vercel sets `x-forwarded-for` honestly (it does; rate limits read the first address).
- Script Content-Security-Policy with nonces (noted in CLAUDE.md, security hardening).
