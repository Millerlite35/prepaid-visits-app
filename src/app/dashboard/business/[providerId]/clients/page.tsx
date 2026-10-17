import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { requireManager } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: `Clients · ${brand.name}` };

export default function ClientsPage(props: PageProps<"/dashboard/business/[providerId]/clients">) {
  return (
    <main className="w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <ClientsContent {...props} />
      </Suspense>
    </main>
  );
}

type ClientRow = { id: string; full_name: string; email: string; visit_accounts: { id: string } | null };
type BalanceRow = { visit_account_id: string; usable_visits: number; next_expiry: string | null };

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
}

async function ClientsContent({ params, searchParams }: PageProps<"/dashboard/business/[providerId]/clients">) {
  const { providerId } = await params;
  const query = await searchParams;
  await requireManager(providerId);

  // only letters, numbers and a few email characters, so the search can't break the query
  const q = (typeof query.q === "string" ? query.q : "").replace(/[^\p{L}\p{N} @._+-]/gu, "").trim().slice(0, 60);

  // read as the signed-in user: row-level security limits everything to this business
  const db = await createSessionClient();
  let clientsQuery = db
    .from("clients")
    .select("id, full_name, email, visit_accounts(id)")
    .eq("provider_id", providerId)
    .order("full_name")
    .limit(500);
  if (q) clientsQuery = clientsQuery.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

  const [clientsRes, balancesRes, providerRes, lastVisitsRes] = await Promise.all([
    clientsQuery.returns<ClientRow[]>(),
    db.from("account_balances").select("visit_account_id, usable_visits, next_expiry").eq("provider_id", providerId).returns<BalanceRow[]>(),
    db.from("providers").select("display_name, vocab_plural").eq("id", providerId).single<{ display_name: string; vocab_plural: string }>(),
    db
      .from("visit_ledger")
      .select("visit_account_id, created_at")
      .eq("provider_id", providerId)
      .eq("kind", "deduct")
      .order("created_at", { ascending: false })
      .limit(2000)
      .returns<{ visit_account_id: string; created_at: string }[]>(),
  ]);
  if (clientsRes.error || balancesRes.error || providerRes.error) {
    return <p className="text-sm text-red-600">Couldn&apos;t load clients. Try refreshing.</p>;
  }

  const balances = new Map(balancesRes.data.map((b) => [b.visit_account_id, b]));
  const lastVisit = new Map<string, string>();
  for (const v of lastVisitsRes.data ?? []) if (!lastVisit.has(v.visit_account_id)) lastVisit.set(v.visit_account_id, v.created_at);
  const plural = providerRes.data.vocab_plural;

  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Clients</h1>
      <p className="mt-1 text-sm text-ink-muted">{providerRes.data.display_name}</p>

      <form className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email"
          className="block w-full rounded-md border border-line bg-surface px-3 py-2"
        />
        <button className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium shadow-sm hover:bg-surface-muted">Search</button>
      </form>

      {clientsRes.data.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          {q ? "No clients match that search." : "No clients yet. They appear here after their first purchase."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-ink-muted dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">{plural.charAt(0).toUpperCase() + plural.slice(1)} left</th>
                <th className="px-3 py-2">Next expiry</th>
                <th className="px-3 py-2">Last check-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clientsRes.data.map((c) => {
                const acct = c.visit_accounts?.id;
                const bal = acct ? balances.get(acct) : undefined;
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2">
                      <Link href={`/dashboard/business/${providerId}/clients/${c.id}`} className="font-medium underline">
                        {c.full_name}
                      </Link>
                      <span className="block text-xs text-ink-muted">{c.email}</span>
                    </td>
                    <td className="px-3 py-2 font-semibold">{bal?.usable_visits ?? 0}</td>
                    <td className="px-3 py-2">{fmt(bal?.next_expiry ?? null)}</td>
                    <td className="px-3 py-2">{acct ? fmt(lastVisit.get(acct) ?? null) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
