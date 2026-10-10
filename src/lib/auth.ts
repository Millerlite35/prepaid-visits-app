import "server-only";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

export type StaffUser = { id: string; email: string };

// The signed-in staff member, or a redirect to /login.
// Call this at the top of every protected page, server action and route handler.
// Never rely on the browser (or on proxy.ts) to have checked.
export async function requireUser(): Promise<StaffUser> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getClaims(); // verifies the login token's signature
  const claims = data?.claims;
  if (error || !claims?.sub) redirect("/login");
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
}
