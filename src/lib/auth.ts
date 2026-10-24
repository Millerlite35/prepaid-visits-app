import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { sessionExpired } from "@/lib/session-trust";
import { createSessionClient } from "@/lib/supabase/server";

export type StaffUser = { id: string; email: string };

async function readSession() {
  await connection(); // login checks always run per request, never prerendered
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getClaims(); // verifies the login token's signature
  const claims = data?.claims;
  if (error || !claims?.sub) redirect("/login");
  return { supabase, claims };
}

function toUser(claims: { sub: string; email?: unknown }): StaffUser {
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
}

// The signed-in staff member who has ALSO passed two-step verification.
// Otherwise redirects to /login, /mfa/setup or /mfa/verify.
// Call this at the top of every protected page, server action and route handler.
// Never rely on the browser (or on proxy.ts) to have checked.
export async function requireUser(): Promise<StaffUser> {
  const { supabase, claims } = await readSession();
  if (claims.aal !== "aal2") {
    const { data } = await supabase.auth.mfa.listFactors();
    redirect((data?.totp.length ?? 0) > 0 ? "/mfa/verify" : "/mfa/setup");
  }
  // 12 hours after the code, or 30 days on a remembered device (src/lib/session-trust.ts)
  if (await sessionExpired(claims)) redirect("/auth/expired");
  return toUser(claims);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StaffRole = "owner" | "manager" | "scan_only";

// The signed-in, two-step-verified user (and their role), if they hold one of these roles
// for the provider. Anyone else is sent to the dashboard.
export async function requireProviderRole(
  providerId: string,
  roles: StaffRole[],
): Promise<StaffUser & { role: StaffRole }> {
  const user = await requireUser();
  if (!UUID.test(providerId)) redirect("/dashboard");
  // read as the user, so row-level security only shows their own memberships
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("provider_members")
    .select("role")
    .eq("provider_id", providerId)
    .eq("user_id", user.id)
    .maybeSingle<{ role: StaffRole }>();
  if (!data || !roles.includes(data.role)) redirect("/dashboard");
  return { ...user, role: data.role };
}

// Any staff member: checking clients in with the scanner.
export function requireStaff(providerId: string) {
  return requireProviderRole(providerId, ["owner", "manager", "scan_only"]);
}

// Owner only: money, page settings and terms (Stripe, refunds). The database's
// providers_update policy is owner-only too.
export function requireOwner(providerId: string): Promise<StaffUser & { role: StaffRole }> {
  return requireProviderRole(providerId, ["owner"]);
}

// Owner or manager: running the business day to day (packages). Not scan-only staff.
export function requireManager(providerId: string): Promise<StaffUser & { role: StaffRole }> {
  return requireProviderRole(providerId, ["owner", "manager"]);
}

// Password-only check. ONLY for the two-step setup and verify pages themselves.
export async function requireSignedIn(): Promise<StaffUser> {
  const { claims } = await readSession();
  return toUser(claims);
}
