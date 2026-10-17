"use server";

import { checkIn } from "@/app/dashboard/business/[providerId]/scan/actions";

// Self check-in at a desk scanner. Same check-in as the staff scanner (record_visit via
// checkIn, which does the staff check, the rate limit and never forces a repeat), but
// the answer is trimmed for a screen the waiting room can see: first name only, and no
// dates or reasons beyond what the client needs.

export type KioskResult =
  | { result: "ok"; firstName: string; remaining: number }
  | { result: "already"; firstName: string }
  | { result: "no_visits" | "expired" | "not_recognised" | "error" };

export async function kioskCheckIn(providerId: string, code: string): Promise<KioskResult> {
  const scan = await checkIn(providerId, code, false);
  const first = (name: string | null) => (name ?? "").trim().split(/\s+/)[0] ?? "";
  switch (scan.result) {
    case "ok":
      return { result: "ok", firstName: first(scan.clientName), remaining: scan.remaining };
    case "duplicate_recent":
      return { result: "already", firstName: first(scan.clientName) };
    case "no_visits":
    case "expired":
      return { result: scan.result };
    case "unknown_code":
    case "revoked":
    case "unassigned":
      return { result: "not_recognised" };
    default:
      return { result: "error" };
  }
}
