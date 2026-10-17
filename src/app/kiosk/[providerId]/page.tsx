import { Suspense } from "react";
import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { requireStaff } from "@/lib/auth";
import { logoUrl } from "@/lib/branding";
import { getAdminClient } from "@/lib/supabase/admin";
import { kioskCheckIn } from "./actions";
import { Kiosk } from "./kiosk";

export const metadata: Metadata = { title: `Self check-in · ${brand.name}` };

// A client-facing check-in screen for a computer with a USB desk scanner. Signed in as
// a staff member (ideally a scan-only account), so leaving it only reaches the scanner.
export default function KioskPage({ params }: PageProps<"/kiosk/[providerId]">) {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center text-sm">Loading…</main>}>
      <KioskContent params={params} />
    </Suspense>
  );
}

async function KioskContent({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  await requireStaff(providerId);

  const { data: provider } = await getAdminClient()
    .from("providers")
    .select("display_name, brand_color, logo_path, vocab_singular, vocab_plural")
    .eq("id", providerId)
    .single<{ display_name: string; brand_color: string; logo_path: string | null; vocab_singular: string; vocab_plural: string }>();

  return (
    <Kiosk
      checkIn={kioskCheckIn.bind(null, providerId)}
      exitHref={`/dashboard/business/${providerId}/scan`}
      name={provider?.display_name ?? ""}
      color={provider?.brand_color ?? brand.colors.primary}
      logo={logoUrl(provider?.logo_path ?? null)}
      singular={provider?.vocab_singular ?? "visit"}
      plural={provider?.vocab_plural ?? "visits"}
    />
  );
}
