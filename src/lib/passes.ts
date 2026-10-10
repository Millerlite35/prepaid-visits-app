import "server-only";
import QRCode from "qrcode";
import { requireEnv } from "@/lib/env";
import { getAdminClient } from "@/lib/supabase/admin";

// A client's pass. The QR code holds ONLY the random credential token (hard rule 2):
// no name, no id, no web address. Anyone with the pass link can show the code, the same
// as a physical card, so a lost pass is handled by revoking it and issuing a new one.

const TOKEN = /^[0-9a-f]{64}$/;

export function isPassToken(token: string): boolean {
  return TOKEN.test(token);
}

export function passUrl(token: string): string {
  return `${requireEnv("SITE_URL")}/pass/${token}`;
}

const QR_OPTIONS = { errorCorrectionLevel: "M" as const, margin: 2 };

export function qrPng(token: string): Promise<Buffer> {
  return QRCode.toBuffer(token, { ...QR_OPTIONS, width: 480 });
}

export function qrSvg(token: string): Promise<string> {
  return QRCode.toString(token, { ...QR_OPTIONS, type: "svg" });
}

export type PassView = {
  status: "active" | "revoked" | "unassigned";
  providerName: string;
  brandColor: string;
  passLabel: string;
  singular: string;
  plural: string;
  usableVisits: number;
  nextExpiry: string | null;
};

// What the pass page shows. Deliberately no client name or email.
export async function loadPass(token: string): Promise<PassView | null> {
  if (!isPassToken(token)) return null;
  const db = getAdminClient();
  const { data: cred } = await db
    .from("credentials")
    .select("status, visit_account_id, providers(display_name, brand_color, pass_label, vocab_singular, vocab_plural)")
    .eq("token", token)
    .maybeSingle<{
      status: PassView["status"];
      visit_account_id: string | null;
      providers: { display_name: string; brand_color: string; pass_label: string; vocab_singular: string; vocab_plural: string };
    }>();
  if (!cred) return null;

  let usableVisits = 0;
  let nextExpiry: string | null = null;
  if (cred.visit_account_id) {
    const { data: bal } = await db
      .from("account_balances")
      .select("usable_visits, next_expiry")
      .eq("visit_account_id", cred.visit_account_id)
      .maybeSingle<{ usable_visits: number; next_expiry: string | null }>();
    usableVisits = bal?.usable_visits ?? 0;
    nextExpiry = bal?.next_expiry ?? null;
  }

  return {
    status: cred.status,
    providerName: cred.providers.display_name,
    brandColor: cred.providers.brand_color,
    passLabel: cred.providers.pass_label,
    singular: cred.providers.vocab_singular,
    plural: cred.providers.vocab_plural,
    usableVisits,
    nextExpiry,
  };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
