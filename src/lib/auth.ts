import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
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
  return toUser(claims);
}

// Password-only check. ONLY for the two-step setup and verify pages themselves.
export async function requireSignedIn(): Promise<StaffUser> {
  const { claims } = await readSession();
  return toUser(claims);
}
