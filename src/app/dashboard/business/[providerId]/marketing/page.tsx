import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
import { requireManager } from "@/lib/auth";
import { loadMarketingData } from "@/lib/marketing";
import { Studio } from "./studio";

export const metadata: Metadata = { title: `Flyers and signs · ${brand.name}` };

// Flyer, counter sign, table tent and social post generator (owners and managers).
// Templates, not AI images: they fill in the logo, colour, packages and a QR code that
// opens the provider's purchase page.
export default function MarketingPage({ params }: PageProps<"/dashboard/business/[providerId]/marketing">) {
  return (
    <main className="w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <MarketingContent params={params} />
      </Suspense>
    </main>
  );
}

async function MarketingContent({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  await requireManager(providerId);
  const data = await loadMarketingData(providerId);
  if (!data) notFound();

  return (
    <>
      <div className="print:hidden">
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Flyers and signs</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Put your packages in front of clients in the waiting room. Each design has a QR code that opens your purchase
          page.
        </p>
        {data.sellingProblem && (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            ⚠ {data.sellingProblem}
          </p>
        )}
        {data.isPrivate && (
          <p className="mt-4 rounded-md bg-surface-muted p-3 text-sm">
            Your purchase page is private, so this QR code includes your private link: anyone who scans it can buy. That&apos;s
            fine for flyers in your office. To share more widely, make the page public in{" "}
            <Link href={`/dashboard/business/${providerId}/settings`} className="underline">
              Page settings
            </Link>
            .
          </p>
        )}
      </div>
      <Studio
        socialBase={`/dashboard/business/${providerId}/marketing/social`}
        businessName={data.businessName}
        color={data.color}
        logo={data.logo}
        qrDataUrl={data.qrDataUrl}
        shortUrl={data.shortUrl}
        contact={data.contact}
        usualPriceCents={data.usualPriceCents}
        singular={data.singular}
        plural={data.plural}
        packages={data.packages}
      />
    </>
  );
}
