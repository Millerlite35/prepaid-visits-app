import "server-only";
import { after } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

// Who LOOKED at client records (HIPAA "audit controls", docs/hipaa-risk-assessment.md R6).
// Changes were already audited; this adds views. Stored in audit_log with ids only:
// never a client's name or email, and never the text someone searched for.
export type AccessAction =
  | "clients.listed" // opened the client list (no search)
  | "clients.searched" // searched the client list, or for a client to link a card to
  | "client.viewed"; // opened one client's page

type AccessEntry = {
  providerId: string;
  actorId: string;
  action: AccessAction;
  clientId?: string;
  metadata?: Record<string, unknown>;
};

// The same person reopening the same page within this window counts as one look
// (forms on the client page refresh it after every action).
const REPEAT_WINDOW_MS = 10 * 60_000;

// Runs after the page has been sent, so it never slows it down, and never throws:
// a failed log line is reported in the server logs but doesn't block the staff member.
export function logAccess(entry: AccessEntry, { collapseRepeats = true } = {}) {
  after(async () => {
    try {
      const db = getAdminClient();
      if (collapseRepeats) {
        let recent = db
          .from("audit_log")
          .select("id")
          .eq("provider_id", entry.providerId)
          .eq("actor_id", entry.actorId)
          .eq("action", entry.action)
          .gte("created_at", new Date(Date.now() - REPEAT_WINDOW_MS).toISOString())
          .limit(1);
        recent = entry.clientId ? recent.eq("entity_id", entry.clientId) : recent.is("entity_id", null);
        const { data } = await recent;
        if (data && data.length > 0) return;
      }
      const { error } = await db.from("audit_log").insert({
        provider_id: entry.providerId,
        actor_id: entry.actorId,
        action: entry.action,
        entity: entry.clientId ? "client" : null,
        entity_id: entry.clientId ?? null,
        metadata: entry.metadata ?? {},
      });
      if (error) console.error(`access log (${entry.action}) failed:`, error.message);
    } catch (e) {
      console.error(`access log (${entry.action}) failed:`, e instanceof Error ? e.message : e);
    }
  });
}
