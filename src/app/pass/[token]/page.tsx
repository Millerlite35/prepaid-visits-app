import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ProviderHeader } from "@/components/provider-header";
import { brand } from "@/config/brand";
import { formatDate, loadPass, qrSvg } from "@/lib/passes";

export const metadata: Metadata = { title: "Your pass", robots: { index: false, follow: false } };

// The client's pass, opened from the link in their email. Shows the check-in QR code
// (token only) and visits left. No name or email, in case the screen is seen by others.
export default function PassPage(props: PageProps<"/pass/[token]">) {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <PassContent {...props} />
      </Suspense>
      <p className="mt-12 text-center text-xs text-zinc-400">Powered by {brand.name}</p>
    </main>
  );
}

async function PassContent({ params }: PageProps<"/pass/[token]">) {
  await connection();
  const { token } = await params;
  const pass = await loadPass(token);
  if (!pass) notFound();

  const header = (
    <ProviderHeader name={pass.providerName} color={pass.brandColor} logoPath={pass.logoPath} subtitle={pass.passLabel} center />
  );

  if (pass.status !== "active") {
    return (
      <>
        {header}
        <p className="mt-8 rounded-lg border border-zinc-200 p-4 text-center text-sm dark:border-zinc-800">
          This pass is no longer active. Please contact {pass.providerName} for a new one.
        </p>
      </>
    );
  }

  const svg = await qrSvg(token);
  const plural = pass.plural.charAt(0).toUpperCase() + pass.plural.slice(1);

  return (
    <>
      {header}
      <div
        className="mx-auto mt-6 w-64 rounded-xl bg-white p-3"
        aria-label="Your check-in code"
        role="img"
        // our own QR library output for our own random token
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="mt-2 text-center text-xs text-zinc-500">Show this code at each {pass.singular} to check in.</p>

      <div className="mt-6 rounded-lg border border-zinc-200 p-4 text-center dark:border-zinc-800">
        <p className="text-sm text-zinc-500">{plural} available</p>
        <p className="text-4xl font-semibold" style={{ color: pass.brandColor }}>
          {pass.usableVisits}
        </p>
        {pass.nextExpiry && <p className="mt-1 text-xs text-zinc-500">Next expiry: {formatDate(pass.nextExpiry)}</p>}
      </div>
      <p className="mt-4 text-center text-xs text-zinc-500">
        Don&apos;t share this page: anyone with it can use your {pass.plural}.
      </p>
    </>
  );
}
