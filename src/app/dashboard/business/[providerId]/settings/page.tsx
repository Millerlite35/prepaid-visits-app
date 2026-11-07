import { Suspense } from "react";
import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { requireOwner } from "@/lib/auth";
import { requireEnv } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";
import { logoUrl } from "@/lib/branding";
import { newPrivateLink, removeLogo, saveAddressAndAccess, saveContact, saveLogo, savePageDetails, saveTerms, saveUsualPrice } from "./actions";
import { LogoForm } from "./logo-form";
import { removeBusiness } from "./remove-actions";
import { RemoveBusinessForm } from "./remove-business-form";
import { AddressForm, ContactForm, PageDetailsForm, PrivateLink, TermsForm, UsualPriceForm, type PageDetails } from "./settings-forms";
import { Icon } from "@/components/icons";
import { Card, PageSkeleton, Section, Sections } from "@/components/ui";

export const metadata: Metadata = { title: `Page settings · ${brand.name}` };

export default function SettingsPage({ params }: PageProps<"/dashboard/business/[providerId]/settings">) {
  return (
    <main className="w-full max-w-2xl flex-1 px-4 py-8 sm:px-8">
      <Suspense fallback={<PageSkeleton variant="form" />}>
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
  closed_at: string | null;
};

async function SettingsContent({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  await requireOwner(providerId);

  // read as the signed-in owner (row-level security)
  const db = await createSessionClient();
  const { data: p, error } = await db
    .from("providers")
    .select(
      "display_name, brand_color, vocab_singular, vocab_plural, pass_label, profession_template, timezone, slug, page_access, private_access_key, terms_text, terms_version, logo_path, office_address, office_phone, office_website, usual_price_cents, closed_at",
    )
    .eq("id", providerId)
    .single<ProviderSettings>();
  if (error) return <p className="text-sm text-danger">Couldn&apos;t load settings. Try refreshing.</p>;
  // any purchase at all (even a $0 complimentary one) means close, not delete (migration 0021)
  const { count: purchaseCount } = await db
    .from("purchases")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", providerId);
  const hasSales = (purchaseCount ?? 0) > 0;

  const site = requireEnv("SITE_URL");
  const privateUrl = `${site}/${p.slug}?key=${p.private_access_key}`;

  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Page settings</h1>
      <p className="mt-1 text-sm text-ink-muted">
        <a href={privateUrlOrPublic(site, p)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
          View your purchase page
          <Icon name="external" className="h-3.5 w-3.5" />
        </a>
      </p>

      <Card title="How your business looks" padded={false} className="mt-6">
        <Sections>
          <Section title="Logo">
            <LogoForm
              action={saveLogo.bind(null, providerId)}
              removeAction={removeLogo.bind(null, providerId)}
              currentUrl={logoUrl(p.logo_path)}
            />
          </Section>
          <Section title="Name, wording and colour">
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
          </Section>
        </Sections>
      </Card>

      <Card title="Price and contact" padded={false} className="mt-6">
        <Sections>
          <Section title={`Price for a single ${p.vocab_singular}`}>
            <UsualPriceForm action={saveUsualPrice.bind(null, providerId)} initialCents={p.usual_price_cents} singular={p.vocab_singular} />
          </Section>
          <Section title="Contact for cards and flyers">
            <ContactForm
              action={saveContact.bind(null, providerId)}
              initial={{ address: p.office_address, phone: p.office_phone, website: p.office_website }}
            />
          </Section>
        </Sections>
      </Card>

      <Card title="Selling" padded={false} className="mt-6">
        <Sections>
          <Section title="Web address and access">
            <AddressForm
              action={saveAddressAndAccess.bind(null, providerId)}
              initialSlug={p.slug}
              initialAccess={p.page_access}
              siteHost={new URL(site).host}
            />
          </Section>
          {p.page_access === "private" && (
            <Section>
              {/* PrivateLink shows its own "Private link" label */}
              <PrivateLink url={privateUrl} renewAction={newPrivateLink.bind(null, providerId)} />
            </Section>
          )}
          <Section title="Terms clients accept before buying">
            <TermsForm
              action={saveTerms.bind(null, providerId)}
              initialTerms={p.terms_text}
              version={p.terms_version}
              businessName={p.display_name}
              singular={p.vocab_singular}
              plural={p.vocab_plural}
            />
          </Section>
        </Sections>
      </Card>

      {!p.closed_at && (
        <section className="mt-6 rounded-xl border border-danger-line bg-surface p-5">
          <h2 className="mb-1 font-medium text-danger">{hasSales ? "Close this business" : "Delete this business"}</h2>
          <RemoveBusinessForm
            action={removeBusiness.bind(null, providerId)}
            hasSales={hasSales}
            plural={p.vocab_plural}
          />
        </section>
      )}
    </>
  );
}
