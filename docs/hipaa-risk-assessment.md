# HIPAA security risk assessment (DRAFT v0.1, Nov 11, 2026)

**Status:** first draft, written before any real client data exists (hard rule 7: test mode and fake
data only). It assesses the app as built today **and** the planned AWS setup (setup D in
`docs/hosting-options.md`). Redo it before the pilot, after the AWS move, after any big change, and at
least once a year. Not legal advice: the attorney should review it with questions 10-14 in
`docs/hosting-options.md`.

**Method:** the approach HHS and NIST describe (NIST SP 800-30, the one HHS's free Security Risk
Assessment Tool follows): list where protected data lives, what could go wrong, how likely and how bad it
would be, what already protects it, and what still has to be done. The results can be copied into the HHS
SRA Tool later if a covered practice asks for it in that form.

**Watch for rule changes:** HHS proposed a major update to the HIPAA Security Rule (published Jan 2025)
that would make several "addressable" items mandatory: multi-factor login, encryption at rest and in
transit, a written asset inventory and network map, restoring systems within 72 hours, and a yearly
compliance audit. Check whether it is final. This plan aims to meet it either way.

---

## 1. Who is responsible
| Role | Person |
|---|---|
| Security Official (HIPAA requires one named person) | The founder |
| Privacy Official | The founder |
| Workforce | The founder only (no employees or contractors with data access) |
| Outside help | Healthcare attorney; independent security reviewer (both planned, not engaged yet) |

## 2. When we are a business associate
VisitBundle is a **business associate** of any provider who is a HIPAA **covered entity** (roughly: sends
health claims or other standard transactions electronically). For those providers, a client's **name +
email + "bought visits from this practice" + check-in dates** is protected health information (ePHI),
even with no diagnosis. Each covered provider needs a signed BAA with us before any real client is entered.

Providers who are not covered entities (many studios, trainers, some cash-only practitioners) are outside
HIPAA, but state health-privacy laws and the FTC Health Breach Notification Rule may still apply (attorney
questions 1, 3, 11, 14). **We protect every provider's data to the same standard**, so one system serves both.

## 3. Where client data lives (asset inventory)
"Today" = Supabase free + Vercel Hobby + Resend (fake data only). "AWS" = setup D.

| # | Where | What client data | Who can reach it | Today | On AWS |
|---|---|---|---|---|---|
| A1 | Database: `clients` | Full name, email | Provider staff (RLS + two-step); server with the secret key | Supabase, encrypted at rest, no BAA | RDS, KMS-encrypted, under BAA |
| A2 | Database: `purchases`, `visit_ledger`, `credentials`, `refunds` | Package bought, price, **dates of every check-in**, pass/card tokens, free-text adjustment notes | Same as A1 | Same | Same |
| A3 | Database: `audit_log` | Staff actions with ids; no names/emails by design | Server only; admins read some | Same | Same + CloudTrail |
| A4 | Database: `support_requests` | Provider staff's messages (could contain client details if staff ignore the warning) | Server only | Same | Same |
| A5 | Database backups | Copies of all of the above | Hosting provider | Supabase free: limited, not tested | RDS automated backups + snapshots |
| A6 | Stripe (provider's connected account) | Client name, email, package name, card details (Stripe's own) | The provider; Stripe; us via the platform | Stripe | Stripe (exemption question 13) |
| A7 | Email service | Client email, practice name, pass link + QR | Email provider | Resend, no BAA | SES under BAA |
| A8 | Pass page `/pass/{token}` and printed QR cards | Visits left, practice name; **no** client name | Anyone holding the link/QR (bearer) | Live | Same |
| A9 | Apple / Google Wallet (step 7, not built) | Practice name, neutral label, visits left, token | Apple/Google, client's phone | n/a | Keep pass contents minimal |
| A10 | Server logs | Ids, error messages; a third-party error text could include an email | Hosting dashboard | Vercel logs, no BAA | CloudWatch under BAA |
| A11 | Founder alert emails | Scrubbed: no names, emails, pass codes, `?key=` | Founder's inbox | Resend -> Gmail | SES -> a mailbox that never receives client data |
| A12 | Provider devices | Whatever staff view: client list, client pages, scanner | Provider staff; anyone at an unlocked device | Provider's responsibility + our session limits | Same |
| A13 | Founder's computer | Secret keys in `.env.local`; fake seed data; no client data | Founder; malware; a thief | Windows 11 Home | Same, plus AWS console access |
| A14 | Admin consoles: Supabase/AWS, Vercel, Stripe, GitHub, Resend, Cloudflare, Google | Full access to everything above | Founder's accounts | Two-step on most (verify all) | Same + AWS root and IAM |
| A15 | AI and dev tools (Claude Code, browser extensions, installed skills/plugins) | None allowed (see R14) | n/a | Rule only | Same |
| A16 | GitHub repo | Code and fake seed data only; no secrets | Founder | Private repo | Same |

## 4. Risks
Likelihood (L) and impact (I): **Low / Med / High**. Risk = the combination. "Today" assumes real data
would be present; it isn't, which is why hard rule 7 exists.

| # | Threat or weakness | Assets | Already protecting it | L | I | Risk | What to do (owner: founder) |
|---|---|---|---|---|---|---|---|
| R1 | Vendors without a BAA hold client data (Supabase free, Vercel Hobby, Resend) | A1-A5, A7, A10 | Hard rule 7 (no real data) | High if real data went in | High | **High** | Move to setup D (or B/C) before any covered provider's real data; sign the AWS BAA in AWS Artifact |
| R2 | Founder's admin account taken over (AWS root, Supabase, Vercel, Stripe, GitHub, Gmail, Cloudflare) | A14, all | Two-step on most accounts | Med | High | **High** | Passkeys or authenticator two-step on EVERY admin account; AWS root locked away (no keys, hardware/passkey MFA), daily work via a separate IAM user/role; password manager; check recovery emails/phones |
| R3 | Bug that lets one provider, a signed-out visitor or a password-only session see another provider's clients | A1-A4 | RLS + restrictive two-step policies, server `require*` checks, 18 SQL test files, self-review (Nov 7) | Med | High | **Med-High** | Keep tests green; independent security review before real data; re-test RLS-equivalent checks after the AWS rebuild (RDS has no Supabase RLS helpers out of the box) |
| R4 | Provider staff account stolen (phishing, reused password) | A1-A2, A12 | Two-step required for all staff, passkeys, 12-char passwords, rate limits on sign-in and codes, alert emails, sessions end after 12 h (30 days if "remember") | Med | Med | **Med** | Fine for pilot; consider shorter "remember" period for covered providers |
| R5 | Unattended or shared device left signed in (front desk, kiosk) | A12 | Kiosk shows first name + visits only; `scan_only` role; 12-hour sessions | Med | Med | **Med** | **Gap: no idle sign-out.** Add auto sign-out after ~15-30 min idle on staff pages (not the kiosk screen); decide the shared-device approach (open decision in CLAUDE.md) |
| R6 | Staff browse client records they have no reason to see, and we can't tell | A1-A2 | Roles; actions are audited | Med | Med | **Med** | **Gap: views aren't logged.** Log "viewed client page/list/search" to `audit_log` (ids only) so a provider can review access; HIPAA "audit controls" and "information system activity review" |
| R7 | Health details typed into free text: adjustment notes, package names/descriptions, business name, support messages | A2, A4, A6, A7 | Pass label keyword check (hard rule 8); support form warning | Med | Med | **Med** | Short warnings on note and package fields; provider terms say "no health details"; extend the keyword check to package names and notes |
| R8 | Data lost: deletion, bad migration, ransomware on the host, provider deletes by mistake | A1-A5 | Ledger is append-only (undo = new row); delete/close business needs the owner's password | Low | High | **Med** | Contingency plan (section 6): RDS automated backups (e.g. 14 days) + a monthly snapshot copied to a second region; **test a restore** before pilot and yearly |
| R9 | App down when clients arrive (check-in fails) | All | UptimeRobot, `/api/health`, alert emails | Med | Low-Med | **Med** | Written "if the scanner is down" step for providers: note names + times on paper, enter later with "Adjust visits" (note required) |
| R10 | Pass link or QR copied by someone else | A8 | Token only, no name; 64-char random; cancel-and-reissue; pass email warns | Med | Low | **Low** | Accepted (bearer pass, like a gift card) |
| R11 | Pass email sent to the wrong address (client typo) | A7 | No health details in email; resend limited to once a minute | Med | Low | **Low** | Accepted; staff can fix the email and reissue |
| R12 | Web attacks: script injection, clickjacking, form abuse, floods | All | Escaping, CSP frame/form/object rules, HSTS, rate limits, signed Stripe webhooks | Low-Med | High | **Med** | Script CSP with nonces at the AWS move; AWS WAF with rate rules before real data |
| R13 | Breach happens but isn't noticed or reported on time | All | Alert emails for server errors, disputes, refund problems | Med | High | **Med-High** | **Gap: no incident/breach plan.** Write it (section 6); a business associate must tell the covered provider without unreasonable delay and **within 60 days** of discovery (the BAA may set less) |
| R14 | Client data pasted into AI tools, browser extensions, screenshots, or third-party skills/plugins | A13, A15 | Memory rule: Claude in Chrome only in the "Visit Pack dev" profile, never near real patient data | Med | High | **Med-High** | Policy: no AI tool or extension ever connects to production with real data unless that vendor has signed a BAA; debug with fake data; screenshots only of test data; review new plugins/skills before installing |
| R15 | Founder's laptop lost, stolen or infected | A13, A14 | Screen lock (verify); no client data stored locally by design | Low-Med | High | **Med** | Turn on Windows device encryption (Windows 11 Home has "Device encryption" on supported hardware; otherwise upgrade to Pro for BitLocker); antivirus on; never download client exports to the laptop; rotate keys if lost |
| R16 | Stripe holds client name/email/package in session metadata | A6 | Neutral pass label; only name + email collected | n/a | Low-Med | **Low-Med** | Attorney question 13 (payment-processing exemption); keep metadata to what's needed |
| R17 | Supply chain: compromised npm package or dev tool | All | `npm audit` clean (Nov 7); lockfile | Low-Med | High | **Med** | Turn on GitHub Dependabot alerts; review dependency updates; pin versions |
| R18 | Data kept forever; no disposal when a provider leaves | A1-A5 | Close-business keeps records (needed for refunds/disputes) | Med | Low-Med | **Low-Med** | Retention schedule: e.g. keep 7 years after a business closes (check with attorney), then delete; at BAA end, return or destroy data as the BAA says |
| R19 | Unreviewed change to production (bad deploy, secret leaked in code) | All | Private repo, no secrets in git history, `lint` + `build` checks | Low | High | **Med** | GitHub two-step + passkey; secret scanning on; at AWS move: deploy only from `main`, IAM least privilege |
| R20 | No written policies or training, so a covered provider or HHS finds us non-compliant even without a breach | Admin | This document | High (today) | Med | **Med-High** | Write the policies in section 7 (a few pages each is enough for a one-person company) |

## 5. Safeguards checklist (Security Rule, 45 CFR 164.308-316)
**Done** = in place; **Partial** = some; **Gap** = still to do; **Host** = covered by AWS under the BAA.

### Administrative
| Standard | Status | Notes |
|---|---|---|
| Risk analysis | Partial | This draft; finish before pilot |
| Risk management | Partial | Section 4 action list |
| Sanction policy | Gap | One paragraph: what happens if a workforce member breaks policy |
| Information system activity review | Partial | Audit log exists; no view logging (R6); no routine review yet: monthly check of audit log + AWS CloudTrail |
| Assigned security responsibility | Done | Section 1 |
| Workforce security / access management | Partial | Roles in the app; founder-only admin access; write down who gets console access and how it's removed |
| Security awareness training | Gap | Founder completes a free HIPAA training (e.g. HHS materials) yearly; keep the certificate |
| Security incident procedures | Gap | Section 6 |
| Contingency plan (backup, disaster recovery, emergency mode) | Gap | Section 6; restore test |
| Evaluation | Gap | Yearly review of this document + the independent security review |
| Business associate contracts | Gap | Our BAA template for covered providers (attorney q10); BAAs with our own vendors (AWS; any other that touches data) |

### Physical (mostly Host)
| Standard | Status | Notes |
|---|---|---|
| Facility access | Host | AWS data centres |
| Workstation use and security | Partial | Founder's laptop: encryption, screen lock, no client data (R15); provider devices are the provider's responsibility, with guidance in the Help FAQ |
| Device and media controls | Partial | No client data on local devices or USB; printed QR cards carry only tokens |

### Technical
| Standard | Status | Notes |
|---|---|---|
| Unique user identification | Done | Every staff member has their own login; no shared logins (advise a `scan_only` account per front desk) |
| Emergency access procedure | Gap | How the founder reaches data if a provider's owner is locked out (documented, audited) |
| Automatic logoff | Gap | Idle sign-out (R5) |
| Encryption at rest | Partial | Supabase encrypts; AWS: RDS + S3 with KMS keys |
| Audit controls | Partial | Actions logged; add view logging (R6); CloudTrail on AWS |
| Integrity | Done | Append-only ledger; balances only from `visit_ledger`; database functions are atomic |
| Person or entity authentication | Done | Password + required two-step, or passkey with Face ID/PIN check |
| Transmission security | Done | HTTPS everywhere, HSTS; SES with "require TLS" on AWS |

## 6. Plans still to write (short versions are fine)
1. **Incident response and breach notification** (R13): how to spot, contain, investigate and record an
   incident; the 4-factor breach risk assessment HIPAA uses; who to tell (the covered provider, within 60
   days at the latest, sooner if the BAA says so; the provider notifies clients and HHS); a log of every
   incident, even ones that turn out not to be breaches.
2. **Contingency plan** (R8, R9): backups and a tested restore; how long we can be down; what providers do
   meanwhile (paper log, then "Adjust visits"); who to call at AWS.
3. **Retention and disposal** (R18).

## 7. Policies to write before signing the first BAA
Access control and account management; acceptable use of devices and AI tools (R14); password and two-step;
encryption; logging and monitoring; incident response (6.1); contingency (6.2); vendor management (which
vendors may hold data and under what agreement); sanctions; training; retention and disposal (6.3);
change management. Templates for small businesses exist (HHS, NIST); each can be one or two pages.

## 8. Action plan
**Now (free, no attorney needed)**
- [ ] Two-step (preferably passkeys) on every admin account in A14; check recovery options (R2)
- [ ] Laptop: device encryption on, screen lock, antivirus (R15)
- [ ] GitHub: Dependabot alerts and secret scanning on (R17, R19)
- [ ] Write the incident response plan and the AI/device acceptable-use policy (R13, R14)
- [ ] Build: idle sign-out on staff pages (R5) and client-view logging (R6)
- [ ] Field warnings + keyword check on notes and package names (R7)

**Before the pilot with any covered provider**
- [ ] Attorney: questions 1, 5, 10-14; BAA template; review this document
- [ ] Move to a BAA setup (setup D); sign the AWS BAA (R1)
- [ ] Rebuild checks verified on AWS: access rules, script CSP, WAF, CloudTrail, KMS (R3, R12)
- [ ] Backups configured and a restore tested (R8)
- [ ] All policies in section 7 written; founder training done
- [ ] Independent security review (R3)
- [ ] Redo this assessment for the real setup

**Every year (and after big changes)**
- [ ] Review and update this document; restore test; training; access review of admin consoles

## 9. Review log
| Date | Version | What changed | By |
|---|---|---|---|
| 2026-11-11 | 0.1 | First draft (pre-pilot, fake data only) | Founder, with Claude |
