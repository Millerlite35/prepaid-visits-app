import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ClientCard, ClientHeader, ClientShell } from "@/components/client-shell";
import { formatCents } from "@/lib/packages";
import { contactLines } from "@/lib/page-settings";
import { loadActivePackages, loadPublicProvider, notSellingReason } from "@/lib/payments/checkout";
import { startCheckout } from "./actions";
import { PurchaseForm } from "./purchase-form";

// The client-facing purchase page: example.com/{slug} (private pages need ?key=...).
// Search engines are asked not to list it; private pages must never show up in search.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PurchasePage(props: PageProps<"/[slug]">) {
  return (
    <Suspense
      fallback={
        <ClientShell>
          <p className="text-center text-sm text-ink-muted">Loading…</p>
        </ClientShell>
      }
    >
      <PurchaseContent {...props} />
    </Suspense>
  );
}

function HowItWorks({ singular }: { singular: string }) {
  const steps = ["Choose a package and pay securely", "Your pass arrives by email", `Show it at each ${singular} to check in`];
  return (
    <ol className="mt-6 grid grid-cols-3 gap-2 text-center text-xs text-ink-muted">
      {steps.map((step, i) => (
        <li key={step} className="rounded-lg bg-surface-muted px-2 py-3">
          <span className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface text-xs font-semibold text-ink shadow-sm">
            {i + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}

async function PurchaseContent({ params, searchParams }: PageProps<"/[slug]">) {
  await connection();
  const { slug } = await params;
  const query = await searchParams;
  const key = typeof query.key === "string" ? query.key : undefined;

  const provider = await loadPublicProvider(slug, key);
  if (!provider) notFound(); // also for a private page without the right key

  const contact = contactLines({ address: provider.office_address, phone: provider.office_phone, website: provider.office_website });
  const header = (
    <ClientHeader
      name={provider.display_name}
      color={provider.brand_color}
      logoPath={provider.logo_path}
      subtitle={`Prepaid ${provider.vocab_singular} packages: pay once, then check in with your pass.`}
    />
  );

  const reason = notSellingReason(provider);
  const packages = reason ? [] : await loadActivePackages(provider.id);
  if (reason || packages.length === 0) {
    return (
      <ClientShell contact={contact}>
        <ClientCard color={provider.brand_color}>
          {header}
          <p className="mt-6 rounded-lg bg-surface-muted p-4 text-center text-sm text-ink-muted">
            {provider.display_name} isn&apos;t selling packages online yet. Please check back soon.
          </p>
        </ClientCard>
      </ClientShell>
    );
  }

  return (
    <ClientShell contact={contact}>
      <ClientCard color={provider.brand_color}>
        {header}
        {provider.usual_price_cents && (
          <p className="mt-4 text-center text-sm text-ink-muted">
            Regular price <span className="font-medium text-ink">{formatCents(provider.usual_price_cents)}</span> per{" "}
            {provider.vocab_singular}. Packages save you more.
          </p>
        )}
        <HowItWorks singular={provider.vocab_singular} />
        <div className="mt-8">
          <PurchaseForm
            action={startCheckout.bind(null, provider.slug, key)}
            packages={packages}
            singular={provider.vocab_singular}
            plural={provider.vocab_plural}
            brandColor={provider.brand_color}
            termsText={provider.terms_text}
            termsVersion={provider.terms_version}
            usualPriceCents={provider.usual_price_cents}
          />
        </div>
      </ClientCard>
    </ClientShell>
  );
}
