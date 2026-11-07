import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { legal } from "@/config/legal";
import { platformFeePercent } from "@/config/payments";
import { LegalList, LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = { title: `Terms · ${brand.name}` };

// Terms for practices using the service (and anyone using the site). A client's agreement
// for a package is with the practice, under the practice's own terms on its purchase page.
export default function TermsPage() {
  const n = brand.name;
  const us = legal.operator === n ? n : `${legal.operator} ("${n}")`;
  return (
    <LegalPage title="Terms of service">
      <p>
        These terms are an agreement between {us} and you. By creating an account or using the site you agree to
        them. Our <Link href="/privacy" className="underline">privacy policy</Link> explains how we handle
        information.
      </p>

      <LegalSection title="What we provide">
        <p>
          {n} is software that lets a practice sell prepaid visit packages on its own page, give clients a pass, and
          check them in. We are not a party to the sale: a client&apos;s agreement for a package is with the practice,
          under the practice&apos;s own terms.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <LegalList
          items={[
            "Give accurate information and keep your sign-in details, authenticator and passkeys secure.",
            "You are responsible for everything done under your account and by staff you invite.",
            "Tell us straight away if you think someone else has got into your account.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Your responsibilities as a practice">
        <LegalList
          items={[
            "You set your packages, prices, expiry rules and terms for clients, and you honour the visits clients buy.",
            "You handle refunds, client questions and disputes, and any taxes on your sales.",
            "You follow the laws that apply to you, including rules on prepaid services, expiry dates, pricing claims and health privacy. A \"regular price\" you show must be one you really charge.",
            `Don't enter health information into ${n}: no diagnoses, treatments or notes. Pass labels must stay neutral.`,
            `${n} does not yet sign HIPAA business associate agreements. If you are a HIPAA covered entity, don't use it with clients until we offer one.`,
          ]}
        />
      </LegalSection>

      <LegalSection title="Payments and fees">
        <LegalList
          items={[
            "Payments are processed by Stripe on your own Stripe account, under Stripe's terms. Money from each sale goes to you, not to us.",
            `Our fee is ${platformFeePercent}% of each package sold, taken automatically at the time of sale. When you refund a sale, the matching part of our fee is refunded too.`,
            "Stripe's own card fees are charged to you by Stripe.",
            "We'll give at least 30 days' notice by email before changing our fees.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>
          Don&apos;t use {n} for anything illegal or misleading, to sell anything other than your own services, or
          to harm the service or other people (for example by trying to get into accounts or data that aren&apos;t
          yours, or overloading the site).
        </p>
      </LegalSection>

      <LegalSection title="Your information and content">
        <p>
          Your business details and your clients&apos; information belong to you. You give us permission to store and
          use them only to run {n} for you. You confirm you have the right to use the name, logo and words you add.
        </p>
      </LegalSection>

      <LegalSection title="Early service">
        <p>
          {n} is new and still changing. We work to keep it running and your information safe, but we can&apos;t
          promise it will always be available or free of errors.
        </p>
      </LegalSection>

      <LegalSection title="Ending">
        <p>
          You can stop using {n} at any time and close or delete your business in Page settings. We may suspend or
          close an account that breaks these terms; where we can, we&apos;ll tell you first. Sales records are kept
          after closing so that refunds and disputes can still be handled.
        </p>
      </LegalSection>

      <LegalSection title="Limits of liability">
        <p>
          The service is provided &quot;as is&quot;. As far as the law allows, we are not liable for indirect or
          lost-profit losses, and our total liability to you is limited to the fees you paid us in the 12 months
          before the claim. You agree to cover claims against us that arise from your sales, your terms with
          clients, or your breaking these terms.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          If we change these terms we&apos;ll update the date at the top and email practices about important
          changes; using {n} after that means you accept them.
          {legal.governingState ? ` These terms are governed by the laws of ${legal.governingState}.` : ""} Questions:{" "}
          <a href={`mailto:${legal.contactEmail}`} className="underline">{legal.contactEmail}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
