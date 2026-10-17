import "server-only";
import QRCode from "qrcode";
import { requireEnv } from "@/lib/env";
import { logoUrl } from "@/lib/branding";
import type { FlyerPackage } from "@/lib/flyer-content";
import { createSessionClient } from "@/lib/supabase/server";

// Data for the flyer and sign generator. Read as the signed-in owner/manager, so
// row-level security applies (call after requireManager).

export type MarketingData = {
  businessName: string;
  color: string;
  logo: string | null;
  singular: string;
  plural: string;
  isPrivate: boolean;
  sellingProblem: string | null;
  purchaseUrl: string;
  shortUrl: string;
  qrDataUrl: string;
  packages: FlyerPackage[];
};

type ProviderRow = {
  display_name: string;
  brand_color: string;
  logo_path: string | null;
  vocab_singular: string;
  vocab_plural: string;
  slug: string;
  page_access: "public" | "private";
  private_access_key: string;
  stripe_charges_enabled: boolean;
  terms_text: string;
};

export async function loadMarketingData(providerId: string): Promise<MarketingData | null> {
  const db = await createSessionClient();
  const [{ data: p }, { data: pkgs }] = await Promise.all([
    db
      .from("providers")
      .select(
        "display_name, brand_color, logo_path, vocab_singular, vocab_plural, slug, page_access, private_access_key, stripe_charges_enabled, terms_text",
      )
      .eq("id", providerId)
      .maybeSingle<ProviderRow>(),
    db
      .from("package_templates")
      .select("id, name, visits, price_cents")
      .eq("provider_id", providerId)
      .eq("active", true)
      .order("sort_order")
      .order("created_at")
      .returns<{ id: string; name: string; visits: number; price_cents: number }[]>(),
  ]);
  if (!p) return null;

  const site = requireEnv("SITE_URL");
  const isPrivate = p.page_access === "private";
  const purchaseUrl = `${site}/${p.slug}${isPrivate ? `?key=${encodeURIComponent(p.private_access_key)}` : ""}`;
  // print-quality QR (vector), high error correction so a small smudge still scans
  const svg = await QRCode.toString(purchaseUrl, { type: "svg", errorCorrectionLevel: "Q", margin: 1 });

  const sellingProblem = !p.stripe_charges_enabled
    ? "Payments aren't set up yet, so the QR code will open a page that can't take purchases."
    : !p.terms_text.trim()
      ? "Your terms are empty, so the page can't take purchases yet. Add them in Page settings."
      : (pkgs ?? []).length === 0
        ? "You don't have any active packages to show."
        : null;

  return {
    businessName: p.display_name,
    color: p.brand_color,
    logo: logoUrl(p.logo_path),
    singular: p.vocab_singular,
    plural: p.vocab_plural,
    isPrivate,
    sellingProblem,
    purchaseUrl,
    shortUrl: `${new URL(site).host}/${p.slug}`,
    qrDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    packages: (pkgs ?? []).map((k) => ({ id: k.id, name: k.name, visits: k.visits, priceCents: k.price_cents })),
  };
}
