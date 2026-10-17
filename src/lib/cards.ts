import "server-only";
import QRCode from "qrcode";
import { getAdminClient } from "@/lib/supabase/admin";

// Physical QR cards (business-card size). A batch is made "unassigned"; the first time
// staff scan one, they link it to a client (link_card). The QR holds ONLY the random
// token (hard rule 2), the same kind of code as the wallet pass. Nothing about the client
// is printed: the balance lives in the app, so one card lasts across future packages.
// Callers must check access first (requireManager).

export const CARD_BATCH_SIZES = [10, 20, 30, 50, 100] as const;
export const MAX_REPRINT = 100;

export type PrintableCard = { id: string; qrDataUrl: string };

async function toPrintable(rows: { id: string; token: string }[]): Promise<PrintableCard[]> {
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      qrDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
        await QRCode.toString(r.token, { type: "svg", errorCorrectionLevel: "M", margin: 1 }),
      )}`,
    })),
  );
}

export async function createCardBatch(providerId: string, count: number, actorId: string): Promise<PrintableCard[]> {
  const db = getAdminClient();
  const { data, error } = await db.rpc("create_card_batch", { p_provider_id: providerId, p_count: count, p_kind: "card" });
  if (error) throw new Error(`create_card_batch failed: ${error.message}`);
  const rows = (data ?? []) as { credential_id: string; token: string }[];
  await db.from("audit_log").insert({
    provider_id: providerId,
    actor_id: actorId,
    action: "cards.created",
    entity: "provider",
    entity_id: providerId,
    metadata: { count: rows.length },
  });
  return toPrintable(rows.map((r) => ({ id: r.credential_id, token: r.token })));
}

// Cards made but not handed out yet, newest first (for printing again after a jam).
export async function unassignedCards(providerId: string): Promise<PrintableCard[]> {
  const { data, error } = await getAdminClient()
    .from("credentials")
    .select("id, token")
    .eq("provider_id", providerId)
    .eq("kind", "card")
    .eq("status", "unassigned")
    .order("issued_at", { ascending: false })
    .limit(MAX_REPRINT)
    .returns<{ id: string; token: string }[]>();
  if (error) throw new Error(`unassigned cards failed: ${error.message}`);
  return toPrintable(data ?? []);
}

export async function cardCounts(providerId: string): Promise<{ unassigned: number; linked: number }> {
  const db = getAdminClient();
  const count = (status: string) =>
    db
      .from("credentials")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", providerId)
      .eq("kind", "card")
      .eq("status", status);
  const [u, l] = await Promise.all([count("unassigned"), count("active")]);
  return { unassigned: u.count ?? 0, linked: l.count ?? 0 };
}

export type LinkResult = { ok: true; clientName: string } | { ok: false; error: string };

// Link an unassigned card (by its scanned code) to one of this provider's clients.
export async function linkCard(providerId: string, token: string, clientId: string, actorId: string): Promise<LinkResult> {
  const db = getAdminClient();
  const { data: account } = await db
    .from("visit_accounts")
    .select("id, clients(full_name)")
    .eq("provider_id", providerId)
    .eq("client_id", clientId)
    .maybeSingle<{ id: string; clients: { full_name: string } | null }>();
  if (!account) return { ok: false, error: "That client wasn't found." };

  const { data: card, error } = await db
    .rpc("link_card", { p_token: token, p_provider_id: providerId, p_visit_account_id: account.id })
    .single<{ id: string }>();
  if (error) {
    if (error.message.includes("unknown card")) return { ok: false, error: "That card isn't one of this business's cards." };
    if (error.message.includes("already")) return { ok: false, error: "That card is already linked to someone." };
    console.error("link_card failed:", error.message);
    return { ok: false, error: "Couldn't link the card. Please try again." };
  }
  await db.from("audit_log").insert({
    provider_id: providerId,
    actor_id: actorId,
    action: "card.linked",
    entity: "credential",
    entity_id: card.id,
    metadata: { client_id: clientId },
  });
  return { ok: true, clientName: account.clients?.full_name ?? "" };
}

// Text typed into a search box, made safe for a PostgREST "or" filter
export function cleanSearch(q: string): string {
  // same rule as the clients page: letters, numbers and a few email characters only
  return q.replace(/[^\p{L}\p{N} @._+-]/gu, "").trim().slice(0, 60);
}
