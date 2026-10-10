import { Suspense } from "react";
import { connection } from "next/server";
import { brand } from "@/config/brand";
import { getAdminClient, getPublicClient } from "@/lib/supabase/admin";

// Temporary home page for build step 2: proves the app can reach the database
// from the server, and that the browser key cannot read provider data.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold text-brand">{brand.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Development build · test mode · fake data only
      </p>

      <section className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-medium">System check</h2>
        <Suspense fallback={<p className="mt-3 text-sm">Checking…</p>}>
          <SystemCheck />
        </Suspense>
      </section>
    </main>
  );
}

type Check = { label: string; ok: boolean; detail: string };

async function SystemCheck() {
  await connection(); // run on every request, never cached
  const checks = [await checkServerConnection(), await checkBrowserKeyBlocked()];

  return (
    <ul className="mt-3 space-y-3">
      {checks.map((c) => (
        <li key={c.label} className="flex gap-3 text-sm">
          <span aria-hidden className={c.ok ? "text-green-600" : "text-red-600"}>
            {c.ok ? "✓" : "✗"}
          </span>
          <span>
            <span className="font-medium">{c.label}</span>
            <br />
            <span className="text-zinc-600 dark:text-zinc-400">{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

async function checkServerConnection(): Promise<Check> {
  const label = "Server can read the database";
  try {
    const db = getAdminClient();
    const { data: provider, error } = await db
      .from("providers")
      .select("id, display_name")
      .eq("slug", "demo-chiro")
      .maybeSingle();
    if (error) return { label, ok: false, detail: explain(error.message) };
    if (!provider) {
      return { label, ok: false, detail: "Connected, but the demo provider is missing. Run supabase/seed.sql." };
    }

    const { count, error: countError } = await db
      .from("package_templates")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", provider.id)
      .eq("active", true);
    if (countError) return { label, ok: false, detail: explain(countError.message) };

    return { label, ok: true, detail: `Demo provider "${provider.display_name}" with ${count} packages for sale.` };
  } catch (e) {
    return { label, ok: false, detail: explain(e) };
  }
}

async function checkBrowserKeyBlocked(): Promise<Check> {
  const label = "Browser key is blocked from provider data";
  try {
    const { data, error } = await getPublicClient().from("providers").select("id").limit(1);
    if (error) return { label, ok: false, detail: explain(error.message) };
    if (data.length > 0) {
      return { label, ok: false, detail: "DANGER: the browser key can read providers. Re-run 0003_access_rules.sql." };
    }
    return { label, ok: true, detail: "Row-level security returned nothing, as it should." };
  } catch (e) {
    return { label, ok: false, detail: explain(e) };
  }
}

// Show the real error while developing; never leak database details once hosted.
function explain(e: unknown): string {
  if (process.env.NODE_ENV === "production") return "Check failed. See server logs.";
  return e instanceof Error ? e.message : String(e);
}
