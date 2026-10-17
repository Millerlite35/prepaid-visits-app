import { Suspense } from "react";
import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { requireOwner } from "@/lib/auth";
import { requireEnv } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";
import { logoUrl } from "@/lib/branding";
import { newPrivateLink, removeLogo, saveAddressAndAccess, saveContact, saveLogo, savePageDetails, saveTerms, saveUsualPrice } from "./actions";
import { LogoForm } from "./logo-form";
import { AddressForm, ContactForm, PageDetailsForm, PrivateLink, TermsForm, UsualPriceForm, type PageDetails } from "./settings-forms";

export const metadata: Metadata = { title: `Page settings · ${brand.name}` };

export default function SettingsPage({ params }: PageProps<"/dashboard/business/[providerId]/settings">) {
  return (
    <main className="w-full max-w-2xl flex-1 px-4 py-8 sm:px-8">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <SettingsContent params={params} />
      </Suspense>
    </main>
  );
}

function privateUrlOrPublic(site: string, p: { slug: string; page_access: string; private_access_key: string }) {
  return p.page_access === "private" ? `${site}/${p.slug}?key=${p.private_access_key}` : `${site}/${p.slug}`;
}

type ProviderSettings = PageDetails & {
  slug: string;
  page_access: "public" | "private";
  private_access_key: string;
  terms_text: string;
  terms_version: number;
  logo_path: string | null;
  office_address: string | null;
  office_phone: string | null;
  office_website: string | null;
  usual_price_cents: number | null;
};

async function SettingsContent({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  await requireOwner(providerId);

  // read as the signed-in owner (row-level security)
  const db = await createSessionClient();
  const { data: p, error } = await db
    .from("providers")
    .select(
      "display_name, brand_color, vocab_singular, vocab_plural, pass_label, profession_template, timezone, slug, page_access, private_access_key, terms_text, terms_version, logo_path, office_address, office_phone, office_website, usual_price_cents",
    )
    .eq("id", providerId)
    .single<ProviderSettings>();
  if (error) return <p className="text-sm text-red-600">Couldn&apos;t load settings. Try refreshing.</p>;

  const site = requireEnv("SITE_URL");
  const privateUrl = `${site}/${p.slug}?key=${p.private_access_key}`;
  const card = "mt-6 rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]";

  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Page settings</h1>
      <p className="mt-1 text-sm text-ink-muted">
        What clients see on {p.display_name}&apos;s purchase page, passes and emails.{" "}
        <a href={privateUrlOrPublic(site, p)} target="_blank" rel="noopener noreferrer" className="underline">
          View your purchase page ↗
        </a>
      </p>

      <section className={card}>
        <h2 className="mb-4 font-medium">Logo</h2>
        <LogoForm
          action={saveLogo.bind(null, providerId)}
          removeAction={removeLogo.bind(null, providerId)}
          currentUrl={logoUrl(p.logo_path)}
        />
      </section>

      <section className={card}>
        <h2 className="mb-4 font-medium">Page details</h2>
        <PageDetailsForm
          action={savePageDetails.bind(null, providerId)}
          initial={{
            display_name: p.display_name,
            brand_color: p.brand_color,
            vocab_singular: p.vocab_singular,
            vocab_plural: p.vocab_plural,
            pass_label: p.pass_label,
            profession_template: p.profession_template,
            timezone: p.timezone,
          }}
        />
      </section>

      <section className={card}>
        <h2 className="mb-1 font-medium">Regular price</h2>
        <p className="mb-4 text-sm text-ink-muted">What one {p.vocab_singular} costs without a package.</p>
        <UsualPriceForm action={saveUsualPrice.bind(null, providerId)} initialCents={p.usual_price_cents} singular={p.vocab_singular} />
      </section>

      <section className={card}>
        <h2 className="mb-1 font-medium">Office contact</h2>
        <p className="mb-4 text-sm text-ink-muted">Printed on your QR cards and flyers.</p>
        <ContactForm
          action={saveContact.bind(null, providerId)}
          initial={{ address: p.office_address, phone: p.office_phone, website: p.office_website }}
        />
      </section>

      <section className={card}>
        <h2 className="mb-4 font-medium">Web address and access</h2>
        <AddressForm
          action={saveAddressAndAccess.bind(null, providerId)}
          initialSlug={p.slug}
          initialAccess={p.page_access}
          siteHost={new URL(site).host}
        />
        {p.page_access === "private" && (
          <div className="mt-6 border-t border-line pt-4">
            <PrivateLink url={privateUrl} renewAction={newPrivateLink.bind(null, providerId)} />
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-2 font-medium">Terms clients accept before buying</h2>
        <TermsForm
          action={saveTerms.bind(null, providerId)}
          initialTerms={p.terms_text}
          version={p.terms_version}
          businessName={p.display_name}
          singular={p.vocab_singular}
          plural={p.vocab_plural}
        />
      </section>
    </>
  );
}
