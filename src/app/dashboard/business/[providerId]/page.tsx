import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { Icon } from "@/components/icons";
import { Badge, buttonClass, Callout, Card, EmptyState, PageHeader, Row, Stat, type Trend } from "@/components/ui";
import { requireManager } from "@/lib/auth";
import { monthName, monthStart } from "@/lib/dates";
import { formatCents } from "@/lib/packages";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: `Overview · ${brand.name}` };

// Business overview for owners and managers. Money figures (sales, refunds, prepaid value)
// are shown to owners only. Everything is read as the signed-in user, so row-level
// security limits it to this business.
export default function OverviewPage({ params }: PageProps<"/dashboard/business/[providerId]">) {
  return (
    <main className="w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <OverviewContent params={params} />
      </Suspense>
    </main>
  );
}

type Sale = { price_cents: number; paid_at: string };
type Refund = { amount_cents: number; completed_at: string };
type Balance = { purchase_id: string; visit_account_id: string; remaining: number; expires_at: string | null };
type Activity = { id: number; kind: string; delta: number; created_at: string; visit_account_id: string };

const ACTIVITY_LABEL: Record<string, string> = {
  grant: "Bought a package",
  deduct: "Checked in",
  undo: "Check-in undone",
  refund: "Refunded",
  adjust: "Adjusted",
  expire: "Expired",
};

function fmtDate(iso: string, timeZone: string, withTime = false) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : { year: "numeric" }),
  });
}

function trend(now: number, before: number, label: string, money = false): Trend {
  const diff = now - before;
  if (diff === 0) return { direction: "flat", text: `vs ${label}` };
  const amount = money ? formatCents(Math.abs(diff)) : Math.abs(diff).toLocaleString("en-US");
  return { direction: diff > 0 ? "up" : "down", text: `${amount} vs ${label}` };
}

async function OverviewContent({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  const { role } = await requireManager(providerId);
  const isOwner = role === "owner";

  const db = await createSessionClient();
  const { data: provider } = await db
    .from("providers")
    .select("display_name, timezone, vocab_singular, vocab_plural")
    .eq("id", providerId)
    .single<{ display_name: string; timezone: string; vocab_singular: string; vocab_plural: string }>();
  if (!provider) return <p className="text-sm text-red-600">Couldn&apos;t load this business.</p>;

  const tz = provider.timezone;
  const now = new Date();
  const thisMonth = monthStart(tz, now).toISOString();
  const lastMonth = monthStart(tz, now, 1).toISOString();
  const lastMonthLabel = monthName(tz, new Date(lastMonth));
  const soon = new Date(now.getTime() + 30 * 86400000).toISOString();

  const [salesRes, refundsRes, checkinsNow, undosNow, checkinsBefore, undosBefore, balancesRes, purchasesRes, activityRes] =
    await Promise.all([
      db
        .from("purchases")
        .select("price_cents, paid_at")
        .eq("provider_id", providerId)
        .gt("price_cents", 0)
        .not("paid_at", "is", null)
        .gte("paid_at", lastMonth)
        .returns<Sale[]>(),
      db
        .from("refunds")
        .select("amount_cents, completed_at")
        .eq("provider_id", providerId)
        .eq("status", "succeeded")
        .gte("completed_at", lastMonth)
        .returns<Refund[]>(),
      db.from("visit_ledger").select("id", { count: "exact", head: true }).eq("provider_id", providerId).eq("kind", "deduct").gte("created_at", thisMonth),
      db.from("visit_ledger").select("id", { count: "exact", head: true }).eq("provider_id", providerId).eq("kind", "undo").gte("created_at", thisMonth),
      db
        .from("visit_ledger")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", providerId)
        .eq("kind", "deduct")
        .gte("created_at", lastMonth)
        .lt("created_at", thisMonth),
      db
        .from("visit_ledger")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", providerId)
        .eq("kind", "undo")
        .gte("created_at", lastMonth)
        .lt("created_at", thisMonth),
      db
        .from("purchase_balances")
        .select("purchase_id, visit_account_id, remaining, expires_at")
        .eq("provider_id", providerId)
        .gt("remaining", 0)
        .returns<Balance[]>(),
      db
        .from("purchases")
        .select("id, price_cents, visits_purchased")
        .eq("provider_id", providerId)
        .returns<{ id: string; price_cents: number; visits_purchased: number }[]>(),
      db
        .from("visit_ledger")
        .select("id, kind, delta, created_at, visit_account_id")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<Activity[]>(),
    ]);

  // Card disputes (chargebacks) that are still open: opened, and not yet closed.
  const { data: disputeLog } = await db
    .from("audit_log")
    .select("action, entity_id, metadata, created_at")
    .eq("provider_id", providerId)
    .in("action", ["dispute.opened", "dispute.closed"])
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<{
      action: string;
      entity_id: string;
      metadata: { purchase_id?: string | null; payment_intent?: string; amount_cents?: number };
      created_at: string;
    }[]>();
  const closedDisputes = new Set((disputeLog ?? []).filter((d) => d.action === "dispute.closed").map((d) => d.entity_id));
  const openDisputes = (disputeLog ?? []).filter((d) => d.action === "dispute.opened" && !closedDisputes.has(d.entity_id));
  // a dispute can arrive before its purchase is recorded, so match by Stripe payment id too
  const disputePayments = openDisputes.map((d) => d.metadata.payment_intent).filter((id): id is string => !!id);
  const { data: disputedPurchases } = disputePayments.length
    ? await db
        .from("purchases")
        .select("visit_account_id, stripe_payment_intent_id")
        .in("stripe_payment_intent_id", disputePayments)
        .returns<{ visit_account_id: string; stripe_payment_intent_id: string }[]>()
    : { data: [] as { visit_account_id: string; stripe_payment_intent_id: string }[] };
  const accountOfPayment = new Map((disputedPurchases ?? []).map((p) => [p.stripe_payment_intent_id, p.visit_account_id]));

  const sales = salesRes.data ?? [];
  const refunds = refundsRes.data ?? [];
  const inThis = (iso: string) => iso >= thisMonth;
  const salesThis = sales.filter((s) => inThis(s.paid_at));
  const salesBefore = sales.filter((s) => !inThis(s.paid_at));
  const grossThis = salesThis.reduce((sum, s) => sum + s.price_cents, 0);
  const grossBefore = salesBefore.reduce((sum, s) => sum + s.price_cents, 0);
  const refundedThis = refunds.filter((r) => inThis(r.completed_at)).reduce((sum, r) => sum + r.amount_cents, 0);
  const refundedBefore = refunds.filter((r) => !inThis(r.completed_at)).reduce((sum, r) => sum + r.amount_cents, 0);
  const netThis = grossThis - refundedThis;
  const netBefore = grossBefore - refundedBefore;
  const visitsThis = (checkinsNow.count ?? 0) - (undosNow.count ?? 0);
  const visitsBefore = (checkinsBefore.count ?? 0) - (undosBefore.count ?? 0);

  // prepaid visits clients haven't used yet (not expired), and roughly what they're worth
  const nowIso = now.toISOString();
  const live = (balancesRes.data ?? []).filter((b) => !b.expires_at || b.expires_at > nowIso);
  const priceOf = new Map((purchasesRes.data ?? []).map((p) => [p.id, p]));
  const outstandingVisits = live.reduce((sum, b) => sum + b.remaining, 0);
  const outstandingValue = live.reduce((sum, b) => {
    const p = priceOf.get(b.purchase_id);
    return sum + (p ? Math.round((p.price_cents / p.visits_purchased) * b.remaining) : 0);
  }, 0);
  const expiring = live
    .filter((b) => b.expires_at && b.expires_at <= soon)
    .sort((a, b) => (a.expires_at! < b.expires_at! ? -1 : 1));

  // client names for the lists below
  const accountIds = [
    ...new Set([
      ...expiring.map((e) => e.visit_account_id),
      ...(activityRes.data ?? []).map((a) => a.visit_account_id),
      ...accountOfPayment.values(),
    ]),
  ];
  const names = new Map<string, { name: string; clientId: string }>();
  if (accountIds.length) {
    const { data } = await db
      .from("visit_accounts")
      .select("id, clients(id, full_name)")
      .in("id", accountIds)
      .returns<{ id: string; clients: { id: string; full_name: string } }[]>();
    data?.forEach((a) => names.set(a.id, { name: a.clients.full_name, clientId: a.clients.id }));
  }
  const clientLink = (accountId: string) => {
    const n = names.get(accountId);
    return n ? (
      <Link href={`/dashboard/business/${providerId}/clients/${n.clientId}`} className="font-medium hover:underline">
        {n.name}
      </Link>
    ) : (
      "A client"
    );
  };

  const one = provider.vocab_singular;
  const many = provider.vocab_plural;
  const Many = many.charAt(0).toUpperCase() + many.slice(1);
  const base = `/dashboard/business/${providerId}`;
  const activity = activityRes.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow={`${monthName(tz, now)} so far`}
        title={provider.display_name}
        actions={
          <>
            <Link href={`${base}/clients`} className={buttonClass("secondary")}>
              <Icon name="clients" className="h-4 w-4" />
              Clients
            </Link>
            <Link href={`${base}/scan`} className={buttonClass("primary")}>
              <Icon name="scan" className="h-4 w-4" />
              Scan a pass
            </Link>
          </>
        }
      />

      {openDisputes.length > 0 && (
        <div className="mb-6">
          <Callout title="Needs attention">
            <ul className="space-y-2">
              {openDisputes.map((d) => {
                const account = d.metadata.payment_intent ? accountOfPayment.get(d.metadata.payment_intent) : undefined;
                return (
                  <li key={d.entity_id}>
                    <span className="font-medium">Card dispute</span>
                    {account ? <> from {clientLink(account)}</> : null}
                    {isOwner && d.metadata.amount_cents ? <> for {formatCents(d.metadata.amount_cents)}</> : null} · opened{" "}
                    {fmtDate(d.created_at, tz)}
                    <span className="block text-xs opacity-80">
                      The client asked their bank to reverse the payment. Respond in your Stripe dashboard (Payments, then
                      Disputes). If the dispute is lost, their unused {many} are removed automatically.
                    </span>
                  </li>
                );
              })}
            </ul>
          </Callout>
        </div>
      )}

      <section className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isOwner ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {isOwner && (
          <Stat
            label="Sales this month, after refunds"
            value={formatCents(netThis)}
            trend={trend(netThis, netBefore, lastMonthLabel, true)}
            hint={refundedThis > 0 ? `${formatCents(grossThis)} in sales, ${formatCents(refundedThis)} refunded` : undefined}
          />
        )}
        <Stat
          label="Packages sold"
          value={salesThis.length.toLocaleString("en-US")}
          trend={trend(salesThis.length, salesBefore.length, lastMonthLabel)}
        />
        <Stat label={`${Many} checked in`} value={visitsThis.toLocaleString("en-US")} trend={trend(visitsThis, visitsBefore, lastMonthLabel)} />
        <Stat
          label={`Prepaid ${many} not yet used`}
          value={outstandingVisits.toLocaleString("en-US")}
          hint={isOwner ? `About ${formatCents(outstandingValue)} paid in advance` : undefined}
        />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Expiring in the next 30 days"
          description={`A friendly reminder now can save a client from losing ${many}.`}
          actions={expiring.length > 0 ? <Badge tone="amber">{expiring.length}</Badge> : undefined}
        >
          {expiring.length === 0 ? (
            <EmptyState>Nothing expiring soon.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {expiring.map((e) => (
                <Row
                  key={e.purchase_id}
                  aside={
                    <>
                      {e.remaining} {e.remaining === 1 ? one : many} · {fmtDate(e.expires_at!, tz)}
                    </>
                  }
                >
                  {clientLink(e.visit_account_id)}
                </Row>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent activity" actions={<Link href={`${base}/clients`} className="text-sm text-ink-muted hover:text-ink">All clients →</Link>}>
          {activity.length === 0 ? (
            <EmptyState>No activity yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((a) => (
                <Row
                  key={a.id}
                  aside={
                    <>
                      <span className={`mr-3 font-mono ${a.delta > 0 ? "text-green-700 dark:text-green-400" : ""}`}>
                        {a.delta > 0 ? `+${a.delta}` : a.delta}
                      </span>
                      {fmtDate(a.created_at, tz, true)}
                    </>
                  }
                >
                  {clientLink(a.visit_account_id)} <span className="text-ink-muted">· {ACTIVITY_LABEL[a.kind] ?? a.kind}</span>
                </Row>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
