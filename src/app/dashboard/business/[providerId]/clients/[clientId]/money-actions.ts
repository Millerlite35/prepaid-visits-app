"use server";

import { refresh } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { formatCents, parseMoneyToCents } from "@/lib/packages";
import { refundPurchase } from "@/lib/payments/refunds";
import { getAdminClient } from "@/lib/supabase/admin";

// Owner-only money and balance changes for one client.

export type MoneyState = { error?: string; message?: string };

async function clientAccount(providerId: string, clientId: string): Promise<string | null> {
  const { data } = await getAdminClient()
    .from("visit_accounts")
    .select("id")
    .eq("client_id", clientId)
    .eq("provider_id", providerId)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

export async function refundAction(
  providerId: string,
  clientId: string,
  purchaseId: string,
  _prev: MoneyState,
  formData: FormData,
): Promise<MoneyState> {
  const user = await requireOwner(providerId);
  const accountId = await clientAccount(providerId, clientId);
  if (!accountId) return { error: "Client not found." };

  // the purchase must belong to this client
  const { data: purchase } = await getAdminClient()
    .from("purchases")
    .select("id")
    .eq("id", purchaseId)
    .eq("visit_account_id", accountId)
    .maybeSingle<{ id: string }>();
  if (!purchase) return { error: "Purchase not found." };

  const visitsRaw = String(formData.get("visits") ?? "0").trim();
  const visits = /^\d{1,3}$/.test(visitsRaw) ? Number(visitsRaw) : NaN;
  const amountCents = parseMoneyToCents(String(formData.get("amount") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  const requestId = String(formData.get("requestId") ?? "");
  if (!Number.isInteger(visits) || visits < 0) return { error: "Enter how many visits to refund (0 or more)." };
  if (!amountCents || amountCents <= 0) return { error: "Enter the amount to refund." };
  if (!/^[0-9a-f-]{36}$/.test(requestId)) return { error: "Please refresh the page and try again." };

  const result = await refundPurchase({ providerId, purchaseId, visits, amountCents, reason, requestId, userId: user.id });
  refresh();
  return result.ok
    ? { message: `Refunded ${formatCents(result.amountCents)} to the client's card. It can take 5 to 10 days to appear.` }
    : { error: result.error };
}

export async function adjustAction(providerId: string, clientId: string, _prev: MoneyState, formData: FormData): Promise<MoneyState> {
  const user = await requireOwner(providerId);
  const accountId = await clientAccount(providerId, clientId);
  if (!accountId) return { error: "Client not found." };

  const direction = String(formData.get("direction") ?? "");
  const countRaw = String(formData.get("count") ?? "").trim();
  const count = /^\d{1,3}$/.test(countRaw) ? Number(countRaw) : NaN;
  const note = String(formData.get("note") ?? "").trim();
  if (!(count >= 1 && count <= 100)) return { error: "Enter a number from 1 to 100." };
  if (direction !== "add" && direction !== "remove") return { error: "Choose add or remove." };
  if (!note) return { error: "Add a short note saying why. It's kept in the client's history." };

  const { data, error } = await getAdminClient().rpc("adjust_visits", {
    p_provider_id: providerId,
    p_visit_account_id: accountId,
    p_delta: direction === "add" ? count : -count,
    p_note: note.slice(0, 200),
    p_user_id: user.id,
  });
  if (error) {
    const available = error.message.match(/only (\d+) visit\(s\) available/);
    if (available) return { error: `Only ${available[1]} available to remove.` };
    console.error("adjust_visits failed:", error.code, error.message);
    return { error: "Couldn't save the change. Please try again." };
  }
  refresh();
  return { message: `Saved. Balance is now ${data}.` };
}
