import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { brand } from "@/config/brand";
import { requireManager } from "@/lib/auth";
import { logoUrl } from "@/lib/branding";
import { CARD_BATCH_SIZES, cardCounts } from "@/lib/cards";
import { contactLines } from "@/lib/page-settings";
import { createSessionClient } from "@/lib/supabase/server";
import { makeCards, reprintCards } from "./actions";
import { CardStudio } from "./card-studio";

export const metadata: Metadata = { title: `QR cards · ${brand.name}` };

// Physical QR cards for clients who don't use phone wallets (owners and managers).
// Print a batch on Avery business-card sheets or a card printer; hand one to a client and
// link it with the first scan.
export default function CardsPage({ params }: PageProps<"/dashboard/business/[providerId]/cards">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <CardsContent params={params} />
      </Suspense>
    </main>
  );
}

async function CardsContent({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  await requireManager(providerId);

  const db = await createSessionClient();
  const { data: p } = await db
    .from("providers")
    .select("display_name, brand_color, logo_path, pass_label, office_address, office_phone, office_website")
    .eq("id", providerId)
    .maybeSingle<{
      display_name: string;
      brand_color: string;
      logo_path: string | null;
      pass_label: string;
      office_address: string | null;
      office_phone: string | null;
      office_website: string | null;
    }>();
  if (!p) notFound();
  const counts = await cardCounts(providerId);
  // a sample code for the preview only (not a real card)
  const sampleSvg = await QRCode.toString("sample-card-preview", { type: "svg", errorCorrectionLevel: "M", margin: 1 });

  return (
    <>
      <Link href={`/dashboard/business/${providerId}`} className="text-sm underline">
        ← {p.display_name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-brand">QR cards</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        For clients who&apos;d rather carry a card than use a phone wallet. Print a batch, hand one over, and link it to
        the client the first time you scan it. It works alongside their emailed pass, for all their future packages.
      </p>
      <p className="mt-3 text-sm">
        <strong>{counts.unassigned}</strong> card{counts.unassigned === 1 ? "" : "s"} ready to hand out ·{" "}
        <strong>{counts.linked}</strong> linked to clients
      </p>
      {!p.office_address && !p.office_phone && !p.office_website && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Tip: add your office address and phone in{" "}
          <Link href={`/dashboard/business/${providerId}/settings`} className="underline">
            Page settings
          </Link>{" "}
          to print them on the cards.
        </p>
      )}
      <CardStudio
        brand={{
          name: p.display_name,
          logo: logoUrl(p.logo_path),
          color: p.brand_color,
          label: p.pass_label,
          contact: contactLines({ address: p.office_address, phone: p.office_phone, website: p.office_website }),
        }}
        sampleQr={`data:image/svg+xml;utf8,${encodeURIComponent(sampleSvg)}`}
        batchSizes={CARD_BATCH_SIZES}
        inStock={counts.unassigned}
        makeCards={makeCards.bind(null, providerId)}
        reprintCards={reprintCards.bind(null, providerId)}
      />
    </>
  );
}
