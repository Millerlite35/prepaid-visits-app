import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { requireStaff } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { checkIn, findClientsForCard, linkScannedCard, undoCheckIn } from "./actions";
import { Scanner } from "./scanner";

export const metadata: Metadata = { title: `Scan · ${brand.name}` };

export default function ScanPage({ params }: PageProps<"/dashboard/business/[providerId]/scan">) {
  return (
    <main className="w-full max-w-md flex-1 px-4 py-8 sm:px-8">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <ScanContent params={params} />
      </Suspense>
    </main>
  );
}

async function ScanContent({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  const { role } = await requireStaff(providerId);

  // scan-only staff can't read the providers table directly, so the server reads the
  // name after the staff check above
  const { data: provider } = await getAdminClient()
    .from("providers")
    .select("display_name, vocab_singular, vocab_plural")
    .eq("id", providerId)
    .single<{ display_name: string; vocab_singular: string; vocab_plural: string }>();

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold text-brand">Check in</h1>
        <Link href="/dashboard" className="text-sm underline">
          Dashboard
        </Link>
      </div>
      <p className="mb-4 text-sm text-zinc-500">{provider?.display_name}</p>
      <Scanner
        checkIn={checkIn.bind(null, providerId)}
        undo={undoCheckIn.bind(null, providerId)}
        singular={provider?.vocab_singular ?? "visit"}
        plural={provider?.vocab_plural ?? "visits"}
        cardLinking={
          role === "scan_only"
            ? null
            : { find: findClientsForCard.bind(null, providerId), link: linkScannedCard.bind(null, providerId) }
        }
      />
      <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
        Have a USB QR scanner on the front desk?{" "}
        <Link href={`/kiosk/${providerId}`} className="font-medium underline">
          Open the self check-in screen
        </Link>{" "}
        and clients can check themselves in.
      </p>
    </>
  );
}
