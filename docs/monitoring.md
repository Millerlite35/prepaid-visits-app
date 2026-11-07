# Monitoring: how you find out when something breaks

Three layers, all free at this size.

## 1. The app emails you (built in)
`src/lib/alerts.ts` emails **ALERT_EMAIL** (or SUPPORT_EMAIL if that's not set) when:
- **any server error** happens on any page, form or API (`src/instrumentation.ts`, Next.js's
  `onRequestError` hook): subject "[VisitBundle] Server error on /route/…";
- a **Stripe webhook** fails (Stripe retries by itself; a one-off is usually events arriving out of order);
- a **refund was paid by Stripe but not recorded**, or a refund made in Stripe later **failed**;
- a **card dispute** is opened or closed.

Rules: no client names, emails or pass codes in alerts (they're scrubbed); the same problem emails at most
once per 15 minutes, and at most 20 alerts an hour overall. Full details are in Vercel > Logs.
While Resend uses its test sender, alerts only reach the Resend account's own email.
Not covered yet: errors that happen only in the browser (they show the "Something went wrong" page).

## 2. An uptime monitor checks the site (you set this up once)
The app has a health check at **`/api/health`**: `200 {"ok":true}` when the database is reachable and the
settings are present, `503` with which check failed otherwise. It never shows data or setting values.

Set up UptimeRobot (free: 50 monitors, checks every 5 minutes):
1. Sign up at uptimerobot.com with the business email.
2. **Add New Monitor** > type **HTTP(s)** > name "VisitBundle app" >
   URL `https://prepaid-visits-app.vercel.app/api/health` > interval 5 minutes.
3. Alert contacts: your email, and the UptimeRobot phone app for push notifications
   (text messages are a paid extra).
4. Save. To test: it should show "Up" within 5 minutes.
After the move to `app.visitbundle.com` (or AWS), change the URL.

## 3. Stripe and Vercel tell you too
- Stripe emails the account owner when a webhook keeps failing.
- Vercel emails when a deploy fails (Settings > Notifications).

## Before real client data
Alerts go through Resend, which has no BAA. They carry no client details today; keep it that way, and move
alerts to the BAA email service (AWS SES) with everything else. An error-tracking service (e.g. Sentry)
would add browser errors and stack traces, but needs a BAA or strict data filtering first.
