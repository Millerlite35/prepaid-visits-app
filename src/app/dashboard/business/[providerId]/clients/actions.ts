"use server";

import { refresh } from "next/cache";
import { requireManager } from "@/lib/auth";
import { sendPassEmail } from "@/lib/pass-email";
import { getAdminClient } from "@/lib/supabase/admin";

// Client pass actions for owners and managers. Reads are checked against the provider
// first; the pass swap itself runs in the database (reissue_wallet_pass) atomically.

export type PassActionState = { error?: string; message?: string };

async function loadClientPass(providerId: string, clientId: string) {
  const db = getAdminClient();
  const { data: account } = await db
    .from("visit_accounts")
    .select("id, clients!inner(id, provider_id, email)")
    .eq("client_id", clientId)
    .eq("provider_id", providerId)
    .maybeSingle<{ id: string; clients: { id: string; provider_id: string; email: string } }>();
  if (!account) return null;

  const [{ data: cred }, { data: purchase }] = await Promise.all([
    db
      .from("credentials")
      .select("id")
      .eq("visit_account_id", account.id)
      .eq("kind", "wallet")
      .eq("status", "active")
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>(),
    db
      .from("purchases")
      .select("id")
      .eq("visit_account_id", account.id)
      .in("status", ["paid", "partially_refunded"])
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>(),
  ]);
  return { accountId: account.id, email: account.clients.email, credentialId: cred?.id ?? null, purchaseId: purchase?.id ?? null };
}

export async function resendPass(providerId: string, clientId: string): Promise<PassActionState> {
  const user = await requireManager(providerId);
  const info = await loadClientPass(providerId, clientId);
  if (!info?.credentialId || !info.purchaseId) return { error: "This client doesn't have an active pass to send." };

  const sent = await sendPassEmail(info.purchaseId, info.credentialId, "resend", user.id);
  if (sent === "sent") return { message: `Pass sent to ${info.email}.` };
  if (sent === "skipped") return { error: "Email isn't set up yet (RESEND_API_KEY)." };
  return { error: "Couldn't send the email. Please try again in a minute." };
}

export async function reissuePass(providerId: string, clientId: string): Promise<PassActionState> {
  const user = await requireManager(providerId);
  const info = await loadClientPass(providerId, clientId);
  if (!info?.purchaseId) return { error: "This client hasn't bought a package yet." };

  const { data: newCredentialId, error } = await getAdminClient().rpc("reissue_wallet_pass", {
    p_provider_id: providerId,
    p_visit_account_id: info.accountId,
    p_user_id: user.id,
  });
  if (error || !newCredentialId) {
    console.error("reissue_wallet_pass failed:", error?.code, error?.message);
    return { error: "Couldn't issue a new pass. Please try again." };
  }
  refresh();

  const sent = await sendPassEmail(info.purchaseId, String(newCredentialId), "reissue", user.id);
  return sent === "sent"
    ? { message: `Old pass cancelled. New pass sent to ${info.email}.` }
    : { error: "Old pass cancelled and a new one issued, but the email didn't send. Use \"Resend pass\"." };
}

// Lost card: cancel it so it stops working straight away. Their balance and other
// passes are untouched. A replacement is any new card, linked with its first scan.
export async function cancelCard(providerId: string, clientId: string, credentialId: string): Promise<PassActionState> {
  const user = await requireManager(providerId);
  const db = getAdminClient();
  const { data: card } = await db
    .from("credentials")
    .select("id, kind, status, visit_accounts!inner(client_id)")
    .eq("id", credentialId)
    .eq("provider_id", providerId)
    .eq("visit_accounts.client_id", clientId)
    .maybeSingle<{ id: string; kind: string; status: string }>();
  if (!card || (card.kind !== "card" && card.kind !== "key_tag")) return { error: "Card not found." };
  if (card.status !== "active") return { error: "That card is already cancelled." };

  const { error } = await db.rpc("revoke_credential", { p_credential_id: credentialId, p_provider_id: providerId });
  if (error) {
    console.error("revoke card failed:", error.message);
    return { error: "Couldn't cancel the card. Please try again." };
  }
  await db.from("audit_log").insert({
    provider_id: providerId,
    actor_id: user.id,
    action: "card.revoked",
    entity: "credential",
    entity_id: credentialId,
    metadata: { client_id: clientId },
  });
  refresh();
  return { message: "Card cancelled. It won't work any more." };
}
