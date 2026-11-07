import { connection } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

// For an uptime monitor (UptimeRobot / Better Stack) to load every few minutes.
// 200 "ok" when the app can reach the database and has its payment and email settings;
// 503 otherwise. Says WHICH check failed, never any data or setting values.
export async function GET() {
  await connection(); // checked live on every request, never cached
  const failed: string[] = [];

  const settings = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "SITE_URL"];
  for (const name of settings) if (!process.env[name]) failed.push(`setting:${name}`);

  try {
    // the cheapest possible query: is the database up and reachable with our key?
    const { error } = await getAdminClient().from("providers").select("id", { head: true, count: "exact" }).limit(1);
    if (error) failed.push("database");
  } catch {
    failed.push("database");
  }

  return Response.json(
    { ok: failed.length === 0, failed },
    { status: failed.length ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
