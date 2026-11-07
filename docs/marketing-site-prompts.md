# Lovable prompts for the marketing site (visitbundle.com)

For the founder's Lovable project (business account). The app itself lives separately (planned
`app.visitbundle.com`); the marketing site only explains and links to sign-up.

## How to use
1. Paste **Prompt 1 (the brief)** first, on its own. It sets the look and the rules for everything after.
2. Then build one section at a time with Prompts 2-9, in order. Check each on your phone before moving on.
3. When the page is together, run **Prompt 10 (the critique pass)**.
4. Before publishing, go through **the checklist at the bottom**. Fill every `[CONFIRM: …]` with a real fact
   or delete that line.

Keep the brand in step with the app: if `src/config/brand.ts` ever changes (name, colours), change Prompt 1.

---

## Prompt 1: the brief (paste first)

```
We're building the marketing website for VisitBundle, a web app for independent practices
(chiropractors, physical therapists, acupuncturists, massage therapists, counsellors; later yoga
and pilates studios and trainers). It lets them sell prepaid visit packages ("6 visits for $450")
from their own branded page. The client pays by card, gets a pass with a QR code by email, and the
practice scans it at each visit. The site has one job: get a practice owner to click "Create your
account".

AUDIENCE: a busy practice owner, 35-60, reading on a phone between patients. Not technical. Wary of
software that adds work. They care about: cash up front, fewer no-shows, less front-desk admin,
looking professional, and not putting client information at risk.

VOICE: plain, warm, specific, like a sensible colleague. Short sentences. Sentence case everywhere.
No hype words (revolutionize, seamless, unlock, empower, game-changer). No exclamation marks.
Say what it does, not how amazing it is.

DESIGN SYSTEM (match the app exactly):
- Colours: navy #1E3A5F (headings, primary buttons), green #4FAE7A (accents only, never body text;
  on dark backgrounds use #6FCF97), page background #F4F6F8, white surfaces #FFFFFF,
  hairline borders #E1E6EC, body text #16243A, secondary text #5B6676.
- Type: "Newsreader" (Google Fonts, serif) for page and section headings only; "Figtree" (Google
  Fonts) for everything else. Body 16-17px on phones, line length under 70 characters.
- Shape: two corner radii only: 6px for buttons and inputs, 12px for panels. Borders, not shadows.
- Logo: the word "VisitBundle" as text, "Visit" in Figtree semibold navy, "Bundle" in Figtree regular
  green, no gap. No icon. White + #6FCF97 on navy backgrounds.
- The ONE signature element: a client's pass drawn as a small white card: label "Wellness visit
  card", "Visits left 6 of 10", a QR-style square, and a row of 10 round punch dots (4 empty
  outlines, 6 filled green). Reuse this motif sparingly (hero, maybe one more place). Everything
  else stays quiet.

RULES:
- Mobile first. Must look right at 375px wide with no sideways scrolling.
- Don't: gradient blobs, glassmorphism, stock photos of smiling people, floating 3D shapes, a logo
  wall, fake testimonials or fake statistics, "Trusted by 1,000+ practices", ALL-CAPS labels above
  headings, arrows (→) on buttons, three identical feature cards in a row, dark mode toggle,
  chat widgets, cookie banners for trackers we don't use.
- No analytics, tracking pixels or third-party scripts.
- Never say "HIPAA compliant", "HIPAA certified" or "secure" without saying how. Never promise
  results ("increase revenue by 30%").
- Only one primary button style per screen; secondary actions are text links.
- All buttons that start sign-up go to: https://app.visitbundle.com/signup
  [CONFIRM: use https://prepaid-visits-app.vercel.app/signup until the app domain is set up]
- Accessible: real text (not text in images), visible keyboard focus, colour contrast AA, alt text.

Start with an empty one-page layout with these sections in order, each a placeholder: header,
hero, how it works, for your practice, privacy, pricing, questions, final call to action, footer.
```

## Prompt 2: header and hero

```
Build the header and hero.

Header: the text logo on the left; on the right a "Sign in" text link
(https://app.visitbundle.com/login) and a small navy "Create your account" button. On phones keep
both visible; no hamburger menu (the page is short).

Hero, left-aligned text on desktop, stacked on phones:
- Heading (Newsreader, large): "Sell prepaid visit packages. Check clients in with one scan."
- One line under it (Figtree, secondary text): "Your own page, your own prices. Clients pay up front
  by card and get a pass by email. You scan it at each visit."
- Primary button: "Create your account". Under it, small text: "Free to set up. Card payments
  through Stripe go straight to your account."
- On the right (below on phones): the signature pass card, tilted 2 degrees, on a plain navy panel.
No background image, no gradient.
```

## Prompt 3: how it works

```
Build "How it works": a real 3-step sequence, so numbers are fine here. Lay it out as a vertical
list on phones and a horizontal row on desktop, connected by a thin line, not as three cards.
1. "Set up your page" - "Add your packages, logo and terms. Connect Stripe to get paid."
2. "Clients buy online" - "They pay by card on your page and get a pass with a QR code by email."
3. "Scan at each visit" - "Use your phone's camera, a USB scanner at the desk, or a self check-in
   screen. Visits left update straight away."
Under the steps, one quiet line: "Clients without a smartphone? Print QR cards from the app."
```

## Prompt 4: for your practice

```
Build "For your practice": the benefits, written from the owner's side. Use a two-column list
(heading + one sentence each) with small line icons, not cards. Six items:
- "Cash up front" - "Packages are paid before the first visit."
- "Less front-desk work" - "No punch cards, no spreadsheets. The balance keeps itself."
- "Your brand" - "Your name, logo and colour on the page, the pass and the emails."
- "Flyers in minutes" - "Print a flyer or counter sign with a QR code to your page."
- "Refunds and changes" - "Refund unused visits or add a complimentary one from the dashboard."
- "Staff roles" - "Give front-desk staff scan-only access. Owners see the money."
```

## Prompt 5: privacy

```
Build a short "Privacy" section on a white panel. Calm, factual, no shields or padlock clip-art.
Heading: "We collect as little as we can."
Three short points:
- "Clients give only their name and email. No date of birth, address or health details."
- "A pass's QR code holds a random code, never a name."
- "Staff sign in with a passkey (Face ID or fingerprint) or a password plus a code from their phone."
Small text under: "Card details are handled by Stripe and never touch our servers."
Don't mention HIPAA here.
```

## Prompt 6: pricing

```
Build "Pricing" as one simple panel, not a three-tier table.
- Heading: "Simple pricing"
- Main line: "[CONFIRM: e.g. 1% of each package sold]" plus Stripe's standard card fees, which
  Stripe charges directly.
- Points: "No setup fee", "Cancel any time", "Money goes straight to your own Stripe account".
  [CONFIRM each point is true before publishing]
- Button: "Create your account".
```

## Prompt 7: questions

```
Build "Questions" as an accordion (one open at a time, keyboard accessible). Questions and answers:
- "Do my clients need an app?" - "No. The pass opens from their email on any phone. Apple Wallet and
  Google Wallet passes are coming." [CONFIRM: keep the Wallet sentence only if still planned]
- "How do I get paid?" - "Through your own Stripe account. Money from each sale goes to you."
- "Can a package expire?" - "You choose: an expiry date or never. Some states limit expiry on
  prepaid services, so check with your attorney."
- "What if a client loses their pass?" - "Resend it, or cancel it and send a new one. Their visits
  stay the same."
- "Can I refund a client?" - "Yes, for unused visits, from their page in the dashboard."
- "What do I need to start?" - "An email address, a phone for sign-in, and a Stripe account (you
  can create one during setup)."
```

## Prompt 8: final call to action and footer

```
Final call to action: a navy band with white Newsreader heading "Set up your page this week." and
one green-on-navy-friendly button "Create your account" (white button, navy text).

Footer: text logo, "Sign in", "Contact" (mailto:[CONFIRM: support email]), "Privacy policy" and
"Terms" (link to pages we'll add), and "© 2026 [CONFIRM: legal business name]". Small, quiet.
```

## Prompt 9: phone polish

```
Check the whole page at 375px wide and fix: no sideways scrolling, buttons at least 44px tall,
headings no larger than 36px on phones, comfortable spacing between sections (about 64px), the
pass card fully visible in the hero, and tap targets not crowded in the header.
```

## Prompt 10: critique pass (after everything is built)

```
Review the page as a strict design lead. List anything that looks like a generic AI/SaaS template
and fix it: gradients, identical cards, all-caps labels, arrows on buttons, too many accent colours,
stock-photo vibes, vague hype copy, more than one primary button per screen, text in images,
inconsistent corner radii or shadows. Also check every claim is specific and true to the brief, and
that nothing says "HIPAA compliant" or invents numbers or testimonials. Then show me what you changed.
```

---

## Checklist before publishing
- [ ] Every `[CONFIRM: …]` replaced with a real fact, or the line removed.
- [ ] No "HIPAA compliant/certified", no invented numbers, no fake testimonials or logos.
- [ ] Sign-up and sign-in links point at the real app address.
- [ ] No analytics, pixels or chat widgets added by Lovable templates.
- [ ] Footer links "Privacy" and "Terms" to https://app.visitbundle.com/privacy and /terms (until that address works: https://prepaid-visits-app.vercel.app/privacy and /terms). Attorney review before launch.
- [ ] Looks right on your phone, nothing to zoom.
- [ ] Name is final (practitioner reactions + attorney trademark answer), or you're OK changing it later.
