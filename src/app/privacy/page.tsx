import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { legal } from "@/config/legal";
import { LegalList, LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = { title: `Privacy · ${brand.name}` };

// Plain-language privacy policy. Keep it true to what the app really does: if a change
// collects something new or adds a service provider, update this page in the same commit.
export default function PrivacyPage() {
  const n = brand.name;
  return (
    <LegalPage title="Privacy policy">
      <p>
        {n} is software that lets practices (clinicians, instructors, trainers and similar) sell prepaid visit
        packages and check clients in. We collect as little as we can, we never sell it, and we never use it for
        advertising.
      </p>

      <LegalSection title="If you bought a package from a practice">
        <p>
          The practice you bought from decides how your information is used; {n} keeps it for them. We hold:
        </p>
        <LegalList
          items={[
            "Your full name and email address.",
            "What you bought, when, which version of the practice's terms you accepted, and each check-in.",
            "A random pass code for your QR code. It contains no name or other details.",
          ]}
        />
        <p>
          We never ask for your phone number, date of birth, address or any health details. Card details go
          straight to Stripe, the payment company; we never see or store them.
        </p>
        <p>
          The practice&apos;s staff can see your name, email, purchases and check-ins. Questions about your
          information, or a request to correct or delete it, can go to the practice or to us.
        </p>
      </LegalSection>

      <LegalSection title="If you run a practice or work at one">
        <LegalList
          items={[
            "Your email address and sign-in details. Passwords are stored only in scrambled (hashed) form by our sign-in provider; backup codes only as hashes.",
            "Your two-step verification and passkey settings, so we can keep your account secure.",
            "Your business details: name, logo, colour, page settings, packages, terms, and the office contact you choose to show.",
            "Your Stripe account ID and whether it can take payments. Your bank details stay with Stripe.",
            "A record of important actions (sales, check-ins, refunds, staff changes) so the business has an accurate history.",
            "Messages you send to support.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Cookies and tracking">
        <p>
          We use one kind of cookie: the sign-in cookie for staff. There are no advertising or analytics cookies,
          tracking pixels or third-party trackers. Some screens remember small choices (such as a flyer style) in
          your own browser; that never leaves your device.
        </p>
      </LegalSection>

      <LegalSection title="Who helps us run the service">
        <p>These companies process information for us, only to run {n}:</p>
        <LegalList
          items={[
            "Supabase: database and staff sign-in.",
            "Vercel: hosting the website.",
            "Stripe: payments, refunds and payouts to the practice.",
            "Resend: sending emails such as your pass.",
            "Cloudflare: our web address (domain).",
          ]}
        />
        <p>We may change these providers (for example, to move hosting) and will update this list when we do.</p>
      </LegalSection>

      <LegalSection title="How we protect it">
        <LegalList
          items={[
            "All staff must use two-step verification or a passkey to see any client information.",
            "Each practice can see only its own clients; this is enforced in the database itself.",
            "Information is encrypted in transit (https). Internet (IP) addresses used to stop repeated sign-in attempts are stored only in scrambled form.",
            "Error reports sent to our team strip out names, emails and pass codes.",
          ]}
        />
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep purchase and check-in records while the practice uses {n}, because they are the record of what
          clients paid for and still have. If a practice closes its business, its sales records are kept so that
          refunds and disputes can still be handled. A practice can delete a business that never made a sale at
          any time.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can ask to see, correct or delete your information by emailing{" "}
          <a href={`mailto:${legal.contactEmail}`} className="underline">{legal.contactEmail}</a>. We may need to
          keep some records (such as payments) where the law requires it. {n} is not meant for children under 13.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If we change this policy, we&apos;ll update the date at the top. For important changes we&apos;ll also
          tell practices by email.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
