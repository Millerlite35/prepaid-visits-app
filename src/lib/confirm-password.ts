import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import { allow, LIMITS } from "@/lib/rate-limit";

// "Enter your password to confirm" before something that can't be undone (deleting or
// closing a business). Checks the password with a throwaway sign-in that never touches the
// person's own login cookies, then ends that extra session straight away.
// Someone using a signed-in computer left open still can't do it without the password.
export async function confirmPassword(userId: string, email: string, password: string): Promise<"ok" | "wrong" | "too_many"> {
  if (!password) return "wrong";
  if (!(await allow("confirm-password", userId, LIMITS.confirmPasswordPerUser))) return "too_many";

  const auth = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth;
  const { data, error } = await auth.signInWithPassword({ email, password });
  if (error || data.user?.id !== userId) return "wrong";
  await auth.signOut({ scope: "local" }).catch(() => {}); // end only this throwaway session
  return "ok";
}
