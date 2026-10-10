import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

let adminClient: SupabaseClient | undefined;

// Full-access database client using the secret key. It bypasses row-level
// security, so only use it in server code, after the server has done its own
// permission checks (hard rule 6). The "server-only" import above makes the
// build fail if this file is ever pulled into browser code.
export function getAdminClient(): SupabaseClient {
  adminClient ??= createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return adminClient;
}

// A client with only the publishable (browser) key, the same access a stranger's
// browser would have. Used to prove row-level security is blocking reads.
export function getPublicClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
