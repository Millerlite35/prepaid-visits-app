import { brand } from "@/config/brand";
import { platformFeePercent } from "@/config/payments";

// Help-centre questions for providers and their staff. Plain language, no jargon.
// Edit freely: the Help page lists them in this order, grouped by topic.

export type FaqItem = { q: string; a: string };
export type FaqTopic = { id: string; title: string; items: FaqItem[] };

export const helpFaq: FaqTopic[] = [
  {
    id: "getting_started",
    title: "Getting started",
    items: [
      {
        q: "How do I start selling packages?",
        a: "From your dashboard: 1) Connect Stripe so you can get paid. 2) Add packages (Quick start suggests prices from your usual rate). 3) In Page settings, add your terms, logo and colour. 4) Share your purchase page link with clients.",
      },
      {
        q: "Where do I find my purchase page link?",
        a: "On the dashboard, next to your business, click \"View purchase page\". You can also see and change it in Page settings under \"Web address and access\".",
      },
      {
        q: "What's the difference between a public and a private page?",
        a: "A public page opens for anyone with your web address. A private page needs your private link (with a secret code in it), so only people you share it with can buy. You can make a new private link anytime if the old one was shared too widely.",
      },
      {
        q: "How do my clients buy?",
        a: "They open your purchase page, pick a package, enter their name and email, accept your terms and pay by card through Stripe. They get their pass by email straight away. They don't need to download anything.",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments and refunds",
    items: [
      {
        q: "When do I get paid?",
        a: "Payments go straight into your own Stripe account, never through us. Stripe then pays out to your bank on its usual schedule (often about two business days). You can see payouts in your Stripe dashboard.",
      },
      {
        q: "What does it cost?",
        a: `Stripe charges its standard card processing fee on each sale, plus a ${platformFeePercent}% ${brand.name} platform fee. Both are taken automatically from the payment before it reaches your bank.`,
      },
      {
        q: "How do I refund a client?",
        a: "Owners can open the client (Clients, then their name) and click \"Refund…\" on a purchase. Choose how many unused visits to cancel and the amount. The money goes back to their card and the visits come off their balance. If you refund in your Stripe dashboard instead, we pick that up and update their balance automatically.",
      },
      {
        q: "A client disputed a payment with their bank. What happens?",
        a: "You'll see \"Needs attention\" on your business overview. Respond to the dispute in your Stripe dashboard (Payments, then Disputes). Their visits stay usable while it's open. If you lose the dispute, their unused visits are removed automatically.",
      },
    ],
  },
  {
    id: "checkins",
    title: "Checking clients in",
    items: [
      {
        q: "How do I check a client in?",
        a: "Open Scan next to your business, tap Start camera and point it at the code on the client's pass (in their email or pass page). You'll hear a beep and see their name and visits left. A USB barcode scanner works too: click the code box and scan.",
      },
      {
        q: "I scanned someone twice by mistake.",
        a: "If you scan the same pass again within two minutes, you'll be warned instead of charged twice. If a visit was taken by mistake, tap \"Undo this check-in\" on the green screen. Front desk staff can undo for 15 minutes; owners and managers can adjust a client's visits anytime.",
      },
      {
        q: "The camera won't start.",
        a: "Allow camera access when the browser asks (or via the camera icon in the address bar). Close other apps using the camera, like Zoom. Some in-app browsers block cameras, so open the page in Safari or Chrome. You can always type or paste the code instead.",
      },
      {
        q: "Can clients check themselves in at the front desk?",
        a: "Yes. Plug a USB QR scanner into the front-desk computer, open Scan, then \"Open the self check-in screen\" and click Start. Clients hold their pass under the scanner and see their first name and how many visits are left; anything wrong says \"Please see the front desk\". Buy a scanner that reads QR codes from phone screens (often called a 2D or hands-free/presentation scanner, about $30 to $80) and works as a USB keyboard with Enter after each scan; most do out of the box. No scanner? Choose \"Start with this device's camera\" instead: a laptop webcam or a tablet on a stand facing clients works, and they hold their phone up to it. Sign that computer in with a scan-only staff account, so leaving the screen only reaches the scanner.",
      },
      {
        q: "A client lost their phone or can't find their pass.",
        a: "Open the client and click \"Resend pass email\" to send the same pass again. If the pass may be in someone else's hands, click \"Cancel pass and send a new one\": the old code stops working straight away and their balance stays the same.",
      },
    ],
  },
  {
    id: "packages",
    title: "Packages",
    items: [
      {
        q: "Can I change a package's price?",
        a: "Yes, in Packages, click Edit. Changes apply to future purchases only. Clients who already bought keep exactly what they paid for.",
      },
      {
        q: "Should my packages expire?",
        a: "That's your choice, but some states limit expiration dates on prepaid services or treat them like gift cards. Please check with your attorney before choosing an expiry.",
      },
      {
        q: "How do I stop selling a package?",
        a: "In Packages, click \"Stop selling\". It disappears from your purchase page, and clients who already bought it can still use their visits. You can sell it again anytime.",
      },
    ],
  },
  {
    id: "account",
    title: "Staff and your account",
    items: [
      {
        q: "How do I add front desk staff or a manager?",
        a: "Owners can open Staff and invite someone by email. Front desk staff can only check clients in. Managers can also see clients and edit packages. Only owners handle refunds, payments, page settings and staff.",
      },
      {
        q: "I forgot my password.",
        a: "On the sign-in page, click \"Forgot password?\". We'll email you a link. You'll also need your authenticator code, which keeps your account safe even if someone gets into your email.",
      },
      {
        q: "I lost the phone with my authenticator app.",
        a: "Sign in with your password, then choose \"Lost your phone? Use a backup code\" and enter one of your backup codes. Your old authenticator is removed and you set up the new phone. Forgot your password too? Use Forgot password, and enter the backup code where it asks for the 6-digit code. No backup codes? Email support from your account's email address; for your security we'll confirm it's really you first.",
      },
      {
        q: "What are backup codes?",
        a: "Ten one-time codes that get you in if you lose your authenticator phone. Make them under Security (top of every page). Print them or keep them in a password manager, not on the same phone. Each works once; make a new set whenever you're running low.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    items: [
      {
        q: "What information do you keep about my clients?",
        a: "Only their name and email, plus their purchases and check-ins. Their pass shows a neutral label and a random code, never their name or anything about their care. Please don't put health details in notes or support messages.",
      },
    ],
  },
];

export const supportTopics = [
  { value: "getting_started", label: "Getting started" },
  { value: "payments", label: "Payments or refunds" },
  { value: "checkins", label: "Checking clients in" },
  { value: "packages", label: "Packages" },
  { value: "account", label: "Staff or my account" },
  { value: "bug", label: "Something isn't working" },
  { value: "other", label: "Something else" },
] as const;
