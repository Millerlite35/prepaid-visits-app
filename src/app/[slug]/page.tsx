import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ProviderHeader } from "@/components/provider-header";
import { brand } from "@/config/brand";
import { loadActivePackages, loadPublicProvider, notSellingReason } from "@/lib/payments/checkout";
import { startCheckout } from "./actions";
import { PurchaseForm } from "./purchase-form";

// The client-facing purchase page: example.com/{slug} (private pages need ?key=...).
// Search engines are asked not to list it; private pages must never show up in search.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PurchasePage(props: PageProps<"/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <PurchaseContent {...props} />
      </Suspense>
      <p className="mt-12 text-center text-xs text-zinc-400">Powered by {brand.name}</p>
    </main>
  );
}

async function PurchaseContent({ params, searchParams }: PageProps<"/[slug]">) {
  await connection();
  const { slug } = await params;
  const query = await searchParams;
  const key = typeof query.key === "string" ? query.key : undefined;

  const provider = await loadPublicProvider(slug, key);
  if (!provider) notFound(); // also for a private page without the right key

  const header = (
    <div className="mb-8">
      <ProviderHeader
        name={provider.display_name}
        color={provider.brand_color}
        logoPath={provider.logo_path}
        subtitle={`Prepaid ${provider.vocab_singular} packages: pay once, then check in with your pass.`}
      />
    </div>
  );

  const reason = notSellingReason(provider);
  const packages = reason ? [] : await loadActivePackages(provider.id);
  if (reason || packages.length === 0) {
    return (
      <>
        {header}
        <p className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          {provider.display_name} isn&apos;t selling packages online yet. Please check back soon.
        </p>
      </>
    );
  }

  return (
    <>
      {header}
      <PurchaseForm
        action={startCheckout.bind(null, provider.slug, key)}
        packages={packages}
        singular={provider.vocab_singular}
        plural={provider.vocab_plural}
        brandColor={provider.brand_color}
        termsText={provider.terms_text}
        termsVersion={provider.terms_version}
      />
    </>
  );
}
