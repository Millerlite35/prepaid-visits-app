import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireEnv } from "@/lib/env";
import { sessionCookieOptions } from "@/lib/supabase/cookie-options";

// Database client acting AS the signed-in staff member (read from their login cookie).
// Row-level security applies, so it only ever sees that person's own business data.
// Use this for provider staff. Use getAdminClient() only for server jobs that have
// already done their own checks (webhooks, public purchase page, scanner).
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookieOptions: sessionCookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Pages can't write cookies while rendering. Safe to ignore:
            // proxy.ts refreshes the session cookie on every request.
          }
        },
      },
    },
  );
}
