import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

// Limits on repeated attempts (checkout, sign-in, password resets, scanning).
// IP addresses and emails are hashed before being stored, so the table never holds them.
// If the check itself fails (database hiccup), we allow the request rather than lock
// everyone out, and log it.

export const LIMITS = {
  checkoutPerIp: { limit: 10, windowSeconds: 600 },
  checkoutPerEmail: { limit: 5, windowSeconds: 3600 },
  signInPerIp: { limit: 20, windowSeconds: 600 },
  resetPerIp: { limit: 5, windowSeconds: 3600 },
  scanPerUser: { limit: 120, windowSeconds: 60 },
} as const;

function hash(value: string): string {
  return createHash("sha256").update(`rate-limit:${value.toLowerCase()}`).digest("hex").slice(0, 32);
}

// The visitor's IP as the host reports it (first entry of x-forwarded-for).
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

// Count one attempt. true = allowed, false = over the limit.
export async function allow(kind: string, who: string, rule: { limit: number; windowSeconds: number }): Promise<boolean> {
  const { data, error } = await getAdminClient().rpc("hit_rate_limit", {
    p_bucket: `${kind}:${hash(who)}`,
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed (allowing):", error.message);
    return true;
  }
  return data === true;
}
