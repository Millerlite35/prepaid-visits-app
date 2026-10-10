"use server";

import { requireStaff } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";

// Check-ins go ONLY through record_visit() (hard rule 5): it locks the client's account so
// two scanners can't take the same visit twice. This file never does its own arithmetic.

export type ScanResult =
  | { result: "ok"; ledgerId: number; clientName: string; remaining: number; nextExpiry: string | null }
  | { result: "duplicate_recent"; clientName: string; remaining: number; nextExpiry: string | null }
  | { result: "no_visits" | "expired"; clientName: string | null }
  | { result: "unknown_code" | "revoked" | "unassigned" | "error" };

export type UndoResult = { ok: true; remaining: number } | { ok: false; error: string };

// Staff can undo their own mistakes for a short while; owners and managers any time.
const STAFF_UNDO_MINUTES = 15;

// The QR code holds only the 64-character token. Also accept a pasted pass link.
function readToken(raw: string): string | null {
  const match = raw.trim().toLowerCase().match(/([0-9a-f]{64})\/?$/);
  return match ? match[1] : null;
}

export async function checkIn(providerId: string, code: string, force: boolean): Promise<ScanResult> {
  const user = await requireStaff(providerId);
  const token = readToken(code);
  if (!token) return { result: "unknown_code" };

  const { data, error } = await getAdminClient()
    .rpc("record_visit", { p_token: token, p_provider_id: providerId, p_user_id: user.id, p_force: force })
    .single<{ result: string; ledger_id: number | null; client_name: string | null; remaining: number | null; next_expiry: string | null }>();
  if (error || !data) {
    console.error("record_visit failed:", error?.code, error?.message);
    return { result: "error" };
  }

  switch (data.result) {
    case "ok":
      return {
        result: "ok",
        ledgerId: data.ledger_id!,
        clientName: data.client_name ?? "",
        remaining: data.remaining ?? 0,
        nextExpiry: data.next_expiry,
      };
    case "duplicate_recent":
      return { result: "duplicate_recent", clientName: data.client_name ?? "", remaining: data.remaining ?? 0, nextExpiry: data.next_expiry };
    case "no_visits":
    case "expired":
      return { result: data.result, clientName: data.client_name };
    case "unknown_code":
    case "revoked":
    case "unassigned":
      return { result: data.result };
    default:
      console.error("record_visit returned an unexpected result:", data.result);
      return { result: "error" };
  }
}

export async function undoCheckIn(providerId: string, ledgerId: number): Promise<UndoResult> {
  const user = await requireStaff(providerId);
  if (!Number.isSafeInteger(ledgerId) || ledgerId <= 0) return { ok: false, error: "That check-in can't be undone." };

  const db = getAdminClient();
  const { data: entry } = await db
    .from("visit_ledger")
    .select("provider_id, kind, created_at")
    .eq("id", ledgerId)
    .maybeSingle<{ provider_id: string; kind: string; created_at: string }>();
  if (!entry || entry.provider_id !== providerId || entry.kind !== "deduct") {
    return { ok: false, error: "That check-in can't be undone." };
  }
  const ageMinutes = (Date.now() - new Date(entry.created_at).getTime()) / 60000;
  if (user.role === "scan_only" && ageMinutes > STAFF_UNDO_MINUTES) {
    return { ok: false, error: "Too late to undo here. Ask the business owner or a manager." };
  }

  const { data, error } = await db.rpc("undo_visit", { p_ledger_id: ledgerId, p_user_id: user.id });
  if (error) {
    if (error.message.includes("already undone")) return { ok: false, error: "That check-in was already undone." };
    console.error("undo_visit failed:", error.code, error.message);
    return { ok: false, error: "Couldn't undo. Please try again." };
  }
  return { ok: true, remaining: Number(data) };
}
