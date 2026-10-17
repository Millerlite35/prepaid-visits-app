import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ClientCard, ClientHeader, ClientShell } from "@/components/client-shell";
import { formatDate, loadPass, qrSvg } from "@/lib/passes";

export const metadata: Metadata = { title: "Your pass", robots: { index: false, follow: false } };

// The client's pass, opened from the link in their email. Shows the check-in QR code
// (token only) and visits left. No name or email, in case the screen is seen by others,
// and no office contact either: the pass stays as discreet as possible.
export default function PassPage(props: PageProps<"/pass/[token]">) {
  return (
    <ClientShell width="sm">
      <Suspense fallback={<p className="text-center text-sm text-ink-muted">Loading…</p>}>
        <PassContent {...props} />
      </Suspense>
    </ClientShell>
  );
}

async function PassContent({ params }: PageProps<"/pass/[token]">) {
  await connection();
  const { token } = await params;
  const pass = await loadPass(token);
  if (!pass) notFound();

  const header = (
    <ClientHeader name={pass.providerName} color={pass.brandColor} logoPath={pass.logoPath} subtitle={pass.passLabel} />
  );

  if (pass.status !== "active") {
    return (
      <ClientCard color={pass.brandColor}>
        {header}
        <p className="mt-6 rounded-lg bg-surface-muted p-4 text-center text-sm text-ink-muted">
          This pass is no longer active. Please contact {pass.providerName} for a new one.
        </p>
      </ClientCard>
    );
  }

  const svg = await qrSvg(token);
  const plural = pass.plural.charAt(0).toUpperCase() + pass.plural.slice(1);

  return (
    <ClientCard color={pass.brandColor}>
      {header}
      <div
        className="mx-auto mt-6 w-64 rounded-2xl border border-line bg-white p-3 shadow-sm"
        aria-label="Your check-in code"
        role="img"
        // our own QR library output for our own random token
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="mt-2 text-center text-xs text-ink-muted">Show this code at each {pass.singular} to check in.</p>

      <div className="mt-6 rounded-xl bg-surface-muted p-4 text-center">
        <p className="text-sm text-ink-muted">{plural} available</p>
        <p className="mt-1 text-5xl font-semibold tabular-nums" style={{ color: pass.brandColor }}>
          {pass.usableVisits}
        </p>
        {pass.nextExpiry && <p className="mt-1 text-xs text-ink-muted">Next expiry: {formatDate(pass.nextExpiry)}</p>}
      </div>
      <p className="mt-4 text-center text-xs text-ink-muted">
        Don&apos;t share this page: anyone with it can use your {pass.plural}.
      </p>
    </ClientCard>
  );
}
