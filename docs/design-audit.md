# Design audit: removing the "AI-generated" feel (Oct 31, 2026)

Done from the current screens (sign-in, system check, demo screenshots of the dashboard,
clients, packages, flyers, cards, scanner, kiosk, purchase/thank-you/pass pages) and the
design code (`globals.css`, `ui.tsx`, class usage). Nothing has been changed yet.

The `frontend-design` skill was not loaded in the session that wrote this; the next session
should re-check these findings with it (see "Next session" at the bottom).

## What already works (keep)
- The **client purchase page** is the strongest screen: provider branding, clear steps,
  "Save 10%" tags. It needs polish, not a rethink.
- Calm palette with real design tokens (`canvas`, `surface`, `line`, `ink`), dark mode,
  role-aware sidebar, "▲ up + words" trend labels (never colour alone).

## Findings, ranked by impact

### 1. Typography is the default starter-kit look (biggest single tell)
- Font is **Geist**, the font every new Next.js project ships with.
- Almost everything is **small**: `text-sm` is used 289 times, `text-base` twice. Pages read
  as one flat grey block; headings barely stand out.
- **Fix:** one deliberate font pairing (e.g. a warm serif for page titles and big numbers,
  a clean characterful sans for everything else; NOT Inter/Roboto/Arial/system defaults),
  and a real type scale: page title, section title, body (16px), small print. Body text
  goes up to 15-16px.

### 2. Colours bypass the design system
- **205 raw Tailwind colours** (`text-red-600` x32, `bg-green-50`, `bg-amber-50`, `zinc-*`...)
  sit next to the tokens. Success/warning/error look slightly different on every page.
- **Brand mismatch:** the app is green + gold; the new logo is navy + light green.
- **Fix:** add status tokens (`success`, `warning`, `danger`, each with a soft background)
  and replace the raw colours; switch `brand.ts` to the navy/green palette when the name is
  confirmed (Nov 7).

### 3. Too many shapes and corner sizes
- Five corner radii in use (`rounded`, `-md` x65, `-lg` x45, `-xl` x23, `-2xl`), and nearly
  every piece of content sits in its own bordered white card. The "everything is a card"
  layout is a classic generated-UI pattern.
- **Fix:** two radii only (small for inputs/buttons, large for panels); fewer cards: group
  related content in one panel with dividers, let some sections sit on the canvas.

### 4. Text symbols instead of icons
- 25 places use typed symbols (⚠ ✓ → ← ▲ ▼) as icons; they render differently per device.
- **Fix:** use the existing `icons.tsx` set (extend it) at one consistent size and stroke.

### 5. "Loading…" text and leftover developer screens
- "Loading…" appears in 22 places, so pages flash plain text before content.
- The home page `/` is still the **"System check · Development build"** page.
- **Fix:** skeleton placeholders shaped like the content; replace `/` with a redirect to
  sign-in (or the dashboard when signed in); the marketing site lives on visitbundle.com.

### 6. Sign-in, sign-up and two-step pages feel like a template
- Small centred white card on a grey page, plain text product name above it, nothing else.
- **Fix:** proper logo, a short reassuring line ("For practices and their staff"), a quiet
  brand panel or illustration on wide screens, consistent field styling, visible focus rings.

### 7. Over-explaining copy
- Many screens add a helper sentence under every button and field ("For a client who can't
  find their email. Same pass, same code."). Useful once, noisy everywhere.
- **Fix:** shorter labels; keep a helper line only where a mistake costs money or access
  (refunds, cancelling passes, staff roles); move the rest into the Help page or tooltips.

### 8. Dashboard overview is the stock "four stat tiles" layout
- Four equal tiles in a row is what every generated dashboard looks like, and the most
  important number (sales this month) gets the same weight as the others.
- **Fix:** one hero figure with a small trend line, the other three as a quieter strip;
  "Expiring soon" and "Recent activity" become the working area.

### 9. Smaller polish items
- Top bar: generic check-mark tile + text name; replace with the real wordmark.
- Tables (clients list): tighten alignment, right-align numbers, tabular figures.
- Buttons: one primary style per screen; secondary actions as quiet text buttons.
- Focus and hover states: make them visible and consistent (keyboard users, front desks).
- Kiosk: bigger, bolder success/failure states readable from 2 metres away.

## Suggested order (each step small and checkable)
1. Type scale + font pairing (biggest visible change, touches only `layout.tsx`,
   `globals.css` and `ui.tsx`). **Done Oct 31.**
2. Status colour tokens + replace raw colours. **Done Oct 31** (also cool, navy-tinted neutrals).
3. Radii + fewer cards (start with the dashboard overview and client page). **Done Oct 31** for
   radii everywhere, overview stats and the client page; Nov 1: Page settings, Packages, Staff and
   Security regrouped too (Help was already one panel).
4. Icons instead of typed symbols; skeletons instead of "Loading…"; retire the `/` page. **Done Oct 31**
   (plus a phone bottom bar with Scan in the middle).
5. Sign-in/two-step pages; copy trim. **Done Oct 31** (plus a global keyboard focus outline).
6. Brand switch to navy/green + wordmark (after the name is confirmed).

## Next session: how to start it
1. Open a **new chat in this project** (same folder), so the newly added skills load.
2. Paste:
   > Read CLAUDE.md and docs/design-audit.md. Load the frontend-design skill and use it to
   > review the audit, propose a design direction (fonts, colours, spacing) for me to approve,
   > then implement step 1 of the suggested order. Show me before/after screenshots.
3. Approve or adjust the direction it proposes before it changes many files.
4. After each step: `npm.cmd run lint` and `npm.cmd run build` must pass; then commit + push.
