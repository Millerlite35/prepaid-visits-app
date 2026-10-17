import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
import { requireManager } from "@/lib/auth";
import { formatCents } from "@/lib/packages";
import { createSessionClient } from "@/lib/supabase/server";
import { cancelCard, reissuePass, resendPass } from "../actions";
import { adjustAction, refundAction } from "./money-actions";
import { AdjustForm, RefundForm } from "./money-forms";
import { CardList } from "./card-list";
import { PassButtons } from "./pass-buttons";

export const metadata: Metadata = { title: `Client · ${brand.name}` };

export default function ClientPage(props: PageProps<"/dashboard/business/[providerId]/clients/[clientId]">) {
  return (
    <main className="w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <ClientContent {...props} />
      </Suspense>
    </main>
  );
}

type Purchase = {
  id: string;
  package_name: string;
  visits_purchased: number;
  price_cents: number;
  status: string;
  paid_at: string | null;
  expires_at: string | null;
  terms_version: number;
  stripe_payment_intent_id: string | null;
};
type LedgerRow = { id: number; kind: string; delta: number; note: string | null; created_at: string; purchase_id: string | null };

const KIND_LABEL: Record<string, string> = {
  grant: "Package purchased",
  deduct: "Check-in",
  undo: "Check-in undone",
  adjust: "Adjustment",
  expire: "Expired",
  refund: "Refund",
};

function fmt(iso: string | null, withTime = false) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

async function ClientContent({ params }: PageProps<"/dashboard/business/[providerId]/clients/[clientId]">) {
  const { providerId, clientId } = await params;
  const { role } = await requireManager(providerId);
  const isOwner = role === "owner";

  // read as the signed-in user: row-level security limits everything to this business
  const db = await createSessionClient();
  const { data: client } = await db
    .from("clients")
    .select("id, full_name, email, created_at, visit_accounts(id)")
    .eq("id", clientId)
    .eq("provider_id", providerId)
    .maybeSingle<{ id: string; full_name: string; email: string; created_at: string; visit_accounts: { id: string } | null }>();
  if (!client) notFound();
  const accountId = client.visit_accounts?.id;

  const [providerRes, balanceRes, purchasesRes, ledgerRes, passRes, remainingRes, refundsRes] = await Promise.all([
    db.from("providers").select("vocab_singular, vocab_plural").eq("id", providerId).single<{ vocab_singular: string; vocab_plural: string }>(),
    accountId
      ? db.from("account_balances").select("usable_visits, next_expiry").eq("visit_account_id", accountId).maybeSingle<{ usable_visits: number; next_expiry: string | null }>()
      : Promise.resolve({ data: null }),
    accountId
      ? db
          .from("purchases")
          .select("id, package_name, visits_purchased, price_cents, status, paid_at, expires_at, terms_version, stripe_payment_intent_id")
          .eq("visit_account_id", accountId)
          .neq("status", "pending")
          .order("created_at", { ascending: false })
          .returns<Purchase[]>()
      : Promise.resolve({ data: [] as Purchase[] }),
    accountId
      ? db
          .from("visit_ledger")
          .select("id, kind, delta, note, created_at, purchase_id")
          .eq("visit_account_id", accountId)
          .order("created_at", { ascending: false })
          .limit(200)
          .returns<LedgerRow[]>()
      : Promise.resolve({ data: [] as LedgerRow[] }),
    accountId
      ? db
          .from("credentials")
          .select("token, issued_at")
          .eq("visit_account_id", accountId)
          .eq("kind", "wallet")
          .eq("status", "active")
          .order("issued_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ token: string; issued_at: string }>()
      : Promise.resolve({ data: null }),
    accountId
      ? db
          .from("purchase_balances")
          .select("purchase_id, remaining")
          .eq("visit_account_id", accountId)
          .returns<{ purchase_id: string; remaining: number }[]>()
      : Promise.resolve({ data: [] as { purchase_id: string; remaining: number }[] }),
    accountId
      ? db
          .from("refunds")
          .select("purchase_id, amount_cents, status, visits, created_at")
          .eq("provider_id", providerId)
          .in("status", ["pending", "succeeded"])
          .returns<{ purchase_id: string; amount_cents: number; status: string; visits: number; created_at: string }[]>()
      : Promise.resolve({ data: [] as { purchase_id: string; amount_cents: number; status: string; visits: number; created_at: string }[] }),
  ]);
  const remainingByPurchase = new Map((remainingRes.data ?? []).map((r) => [r.purchase_id, r.remaining]));
  const refundedByPurchase = new Map<string, number>();
  for (const r of refundsRes.data ?? []) refundedByPurchase.set(r.purchase_id, (refundedByPurchase.get(r.purchase_id) ?? 0) + r.amount_cents);

  const { data: cardRows } = accountId
    ? await db
        .from("credentials")
        .select("id, linked_at")
        .eq("visit_account_id", accountId)
        .in("kind", ["card", "key_tag"])
        .eq("status", "active")
        .order("linked_at", { ascending: false })
        .returns<{ id: string; linked_at: string | null }[]>()
    : { data: [] as { id: string; linked_at: string | null }[] };

  const one = providerRes.data?.vocab_singular ?? "visit";
  const many = providerRes.data?.vocab_plural ?? "visits";
  const balance = balanceRes.data;
  const purchases = purchasesRes.data ?? [];
  const ledger = ledgerRes.data ?? [];
  const pass = passRes.data;
  const card = "mt-6 rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]";

  return (
    <>
      <Link href={`/dashboard/business/${providerId}/clients`} className="text-sm underline">
        ← Clients
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">{client.full_name}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {client.email} · client since {fmt(client.created_at)}
      </p>

      <section className={`${card} flex flex-wrap items-center gap-6`}>
        <div>
          <p className="text-sm text-ink-muted">{many.charAt(0).toUpperCase() + many.slice(1)} left</p>
          <p className="text-4xl font-semibold text-brand">{balance?.usable_visits ?? 0}</p>
        </div>
        {balance?.next_expiry && (
          <div>
            <p className="text-sm text-ink-muted">Next expiry</p>
            <p className="font-medium">{fmt(balance.next_expiry)}</p>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-1 font-medium">Pass</h2>
        <p className="mb-4 text-sm text-ink-muted">
          {pass ? (
            <>
              Active since {fmt(pass.issued_at)}.{" "}
              <a href={`/pass/${pass.token}`} target="_blank" rel="noopener noreferrer" className="underline">
                View pass ↗
              </a>
            </>
          ) : (
            "No active pass."
          )}
        </p>
        <PassButtons
          resend={resendPass.bind(null, providerId, clientId)}
          reissue={reissuePass.bind(null, providerId, clientId)}
          hasPass={!!pass}
        />
      </section>

      <section className={card}>
        <h2 className="mb-3 font-medium">QR cards</h2>
        <CardList
          cards={(cardRows ?? []).map((c) => ({
            id: c.id,
            linkedAt: c.linked_at ? fmt(c.linked_at) : "",
            cancel: cancelCard.bind(null, providerId, clientId, c.id),
          }))}
        />
      </section>

      <section className={card}>
        <h2 className="mb-3 font-medium">Purchases</h2>
        {purchases.length === 0 ? (
          <p className="text-sm text-ink-muted">No purchases.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {purchases.map((p) => {
              const remaining = remainingByPurchase.get(p.id) ?? 0;
              const refunded = refundedByPurchase.get(p.id) ?? 0;
              const refundable = p.price_cents - refunded;
              const canRefund =
                isOwner && !!p.stripe_payment_intent_id && (p.status === "paid" || p.status === "partially_refunded") && refundable > 0;
              return (
                <li key={p.id} className="py-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>
                      <span className="font-medium">{p.package_name}</span>: {p.visits_purchased}{" "}
                      {p.visits_purchased === 1 ? one : many} · {formatCents(p.price_cents)}
                      <span className="block text-xs text-ink-muted">
                        {p.package_name === "Complimentary" ? "Added" : "Bought"} {fmt(p.paid_at)}
                        {p.expires_at ? ` · expires ${fmt(p.expires_at)}` : " · never expires"}
                        {p.stripe_payment_intent_id ? ` · accepted terms v${p.terms_version}` : ""} · {remaining} unused
                        {refunded > 0 ? ` · ${formatCents(refunded)} refunded` : ""}
                      </span>
                    </span>
                    {p.status !== "paid" && <span className="text-xs font-medium uppercase text-amber-700">{p.status.replace("_", " ")}</span>}
                  </div>
                  {canRefund && (
                    <RefundForm
                      action={refundAction.bind(null, providerId, clientId, p.id)}
                      remaining={remaining}
                      refundableCents={refundable}
                      perVisitCents={Math.round(p.price_cents / p.visits_purchased)}
                      plural={many}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isOwner && accountId && (
        <section className={card}>
          <h2 className="mb-3 font-medium">Add or remove {many}</h2>
          <AdjustForm action={adjustAction.bind(null, providerId, clientId)} plural={many} />
        </section>
      )}

      <section className={card}>
        <h2 className="mb-3 font-medium">History</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-line">
              {ledger.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 pr-3 text-ink-muted">{fmt(l.created_at, true)}</td>
                  <td className="py-2 pr-3">
                    {KIND_LABEL[l.kind] ?? l.kind}
                    {l.note && (l.kind === "adjust" || l.kind === "refund") && l.note !== "Refund" && (
                      <span className="block text-xs text-ink-muted">{l.note}</span>
                    )}
                  </td>
                  <td className={`py-2 text-right font-mono ${l.delta > 0 ? "text-green-700 dark:text-green-500" : "text-red-700 dark:text-red-400"}`}>
                    {l.delta > 0 ? `+${l.delta}` : l.delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
