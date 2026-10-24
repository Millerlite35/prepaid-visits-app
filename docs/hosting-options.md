# Hosting and BAA options

Researched October 2026. Prices change often: confirm each one on the vendor's own page or
with their sales team before signing anything. Not legal advice; the HIPAA questions at the
end are for the healthcare attorney.

## What needs hosting

| Piece | Today (testing) | Needs a BAA if we handle PHI? |
|---|---|---|
| Database + logins (Supabase) | Free plan | Yes: holds client names, emails, visits |
| The app itself (Next.js server) | Your PC (`localhost`) | Yes: client data passes through it |
| Email (pass emails, alerts) | Resend test sender | Yes: emails go to clients by name |
| Payments (Stripe) | Sandbox | No: card processing is exempt under HIPAA, and Stripe doesn't sign BAAs. Keep health details out of anything sent to Stripe |

The app is built deeply on Supabase (logins, two-step, row-level security, database
functions). Moving off it would mean rebuilding a large part of the app, so every option below
keeps Supabase.

## The parts, with prices

### Database: Supabase
- **Pro:** $25/month per project + usage. **No BAA.**
- **Team:** from **$599/month**. HIPAA is a **paid add-on** whose price isn't published.
  The last public figure was **$350/month** (a Supabase staff member, August 2025). Ask
  Supabase for a written quote.
- A HIPAA project must also turn on point-in-time backups (needs a small compute add-on),
  forced SSL, network restrictions and connection logging. Budget roughly another
  $100-150/month (an estimate; confirm it).
- **About $950-1,100/month for HIPAA**, versus about $25-40/month without.

### App hosting
| Host | Without a BAA | With a BAA | Notes |
|---|---|---|---|
| **Vercel** | Hobby free (not for business use), Pro $20/user/month | Pro + **$350/month** HIPAA add-on | Made by the Next.js team; deploys on every `git push`; least to learn |
| **Fly.io** | Pay as you go (roughly $5-30/month for us) | + **$99/month** HIPAA package, BAA pre-signed, any paid plan | Cheapest BAA; more hands-on (command line, Docker) |
| **Render** | From about $7-25/month | Scale or Enterprise plan; terms changed in 2026 (sources disagree) | Ask Render for current terms |
| **Aptible** | Not offered | **$499/month** Production plan + resources; startup credits for 6 months | Built only for HIPAA apps; most compliance help; still expensive |
| **AWS (Amplify)** | Usage-based | BAA accepted in AWS Artifact (no listed fee) | Cheapest at scale, but by far the most setup and upkeep for one founder |
| Railway | Usage-based | BAA only with large commitments (around $1,000/month or a $12k/year contract) | Not a fit now |

### Email
| Service | BAA? | Cost |
|---|---|---|
| Resend (current) | **No** BAA (per a competitor's statement; ask Resend to confirm) | Free up to 3,000/month; needs a verified domain for real sending |
| **Paubox** | Yes, BAA on every plan including free | Free up to about 300 emails/month, then paid plans |
| Amazon SES | Yes, under the AWS BAA | About $0.10 per 1,000 emails; set "require TLS" (it can otherwise fall back to unencrypted delivery) |
| Postmark, Mailgun, SendGrid | Unclear or no: sources conflict | Check directly if wanted |

## Three setups

| | A. Launch without a BAA | B. HIPAA, lowest cost | C. HIPAA, easiest |
|---|---|---|---|
| Database | Supabase Pro | Supabase Team + HIPAA | Supabase Team + HIPAA |
| App | Vercel Pro | Fly.io + HIPAA | Vercel Pro + HIPAA |
| Email | Resend (own domain) | Paubox | Paubox |
| **About per month** | **$50-70** | **$1,100-1,250** | **$1,350-1,500** |
| Clinicians' real clients? | Only if the attorney says no BAA is needed | Yes | Yes |

The fixed HIPAA cost is about $1,100+/month whoever the clients are. At the current 1%
platform fee, that takes roughly **$110,000 of package sales a month** to cover. The
subscription price in the business plan matters a lot here.

## Recommendation
1. **Now (fake data only): move to setup A**, ideally Vercel Hobby + the current free Supabase,
   so $0. This gets real https links: pass emails open on phones, the phone camera works,
   and "Add to Home Screen" works on phones. Nothing about real clients changes (hard rule 7).
2. **Ask the attorney the questions below before choosing B or C.** The answer decides whether
   the first pilot needs a BAA at all.
3. **If a BAA is needed: start with C (Vercel)** for the least to learn and maintain alone.
   Switch the app to Fly.io (setup B) later if the $250/month difference matters. The database
   and email stay the same either way.
4. If the first market is yoga/pilates/trainers/coaches (not healthcare providers), setup A
   may be enough for the pilot. Add the HIPAA setup when the first clinician signs up.

## Questions for the healthcare attorney
1. Many cash-only practitioners (no electronic insurance billing) are not HIPAA "covered
   entities". If our providers aren't, are we still a business associate? Does that change
   per profession (therapist vs. yoga instructor)?
2. Is a client's name + email + "bought sessions from [provider]" health information here?
   For a therapist? For a yoga studio?
3. Do state laws apply even without HIPAA (e.g. Washington's My Health My Data Act,
   California's CMIA) and what would they require of us?
4. Is it acceptable that package names and the provider's business name go to Stripe and
   appear on card statements? (We keep pass labels neutral; package names are written by
   the provider.)
5. Can we pilot with non-clinical providers on setup A, and add the BAA setup before
   onboarding any clinician?
6. Name "VisitBundle" (visitbundle.com): can we use and register it? It is fairly
   descriptive, so is the main register realistic, or the supplemental register? Anything
   close in classes 9/42 (software) or 44 (health services)?
7. MDSave holds patents on "prepaid healthcare bundles" (e.g. US 11,367,115, US 11,315,160:
   a marketplace that splits one payment across several providers). Our model is one
   provider selling its own prepaid visits, paid directly to its Stripe account. Is a
   patent review worth doing before launch?

## Before any real client data (whichever setup)
- Signed BAAs with every vendor that touches client data (database, app host, email).
- Supabase HIPAA project settings on; region chosen (hard to move later).
- A verified email domain (needs the final product name).
- Attorney-reviewed terms and privacy policy.
- The independent security review (CLAUDE.md "Who is building").
