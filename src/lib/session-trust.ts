import "server-only";
import { cache } from "react";
import { getAdminClient } from "@/lib/supabase/admin";

// "Remember this device for 30 days" (migration 0019).
// A sign-in lasts SHORT_HOURS after the two-step code, or REMEMBER_DAYS if the person ticked
// "remember". The code is never skipped: signing out and back in always asks for it again,
// and the database still requires two-step (aal2) for every staff read.
export const REMEMBER_DAYS = 30;
export const SHORT_HOURS = 12;

type Claims = { sub: string; session_id?: unknown; amr?: unknown };

function sessionIdOf(claims: Claims): string | null {
  return typeof claims.session_id === "string" ? claims.session_id : null;
}

// When this session last passed the two-step code (Unix seconds), from the signed login token.
function codeTime(claims: Claims): number | null {
  if (!Array.isArray(claims.amr)) return null;
  const times = claims.amr
    .filter((e): e is { method: string; timestamp: number } =>
      typeof e === "object" && e !== null && e.method === "totp" && typeof e.timestamp === "number",
    )
    .map((e) => e.timestamp);
  return times.length > 0 ? Math.max(...times) : null;
}

// once per request, however many pages and layouts call requireUser
const isRemembered = cache(async (sessionId: string): Promise<boolean> => {
  const { data, error } = await getAdminClient()
    .from("session_trust")
    .select("remember")
    .eq("session_id", sessionId)
    .maybeSingle<{ remember: boolean }>();
  if (error) console.error("session trust read failed:", error.message); // falls back to the short limit
  return data?.remember === true;
});

export async function sessionExpired(claims: Claims): Promise<boolean> {
  const sessionId = sessionIdOf(claims);
  const at = codeTime(claims);
  if (!sessionId || at === null) return true;
  const limitSeconds = (await isRemembered(sessionId)) ? REMEMBER_DAYS * 86400 : SHORT_HOURS * 3600;
  return Date.now() / 1000 - at > limitSeconds;
}

// Right after a successful two-step code: record the person's choice for this session.
export async function saveRemember(claims: Claims, remember: boolean): Promise<void> {
  const sessionId = sessionIdOf(claims);
  if (!sessionId) return;
  const admin = getAdminClient();
  const { error } = await admin
    .from("session_trust")
    .upsert({ session_id: sessionId, user_id: claims.sub, remember, created_at: new Date().toISOString() });
  if (error) console.error("session trust save failed:", error.message); // they get the short limit
  // tidy up this person's old sessions (none can outlive REMEMBER_DAYS)
  const cutoff = new Date(Date.now() - (REMEMBER_DAYS + 1) * 86400 * 1000).toISOString();
  await admin.from("session_trust").delete().eq("user_id", claims.sub).lt("created_at", cutoff);
}

export function wantsRemember(formData: FormData): boolean {
  return formData.get("remember") === "on";
}
