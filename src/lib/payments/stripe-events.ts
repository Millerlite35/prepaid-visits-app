import "server-only";
import type Stripe from "stripe";
import { syncAccountStatus } from "@/lib/payments/connect";
import { getAdminClient } from "@/lib/supabase/admin";

// Stripe messages about things that can happen OUTSIDE the app, on a provider's own
// Stripe account: refunds made in their Stripe dashboard, card disputes, and account
// status changes. Every handler is safe to run twice (Stripe may resend).

async function providerForAccount(accountId: string): Promise<string | null> {
  const { data } = await getAdminClient()
    .from("providers")
    .select("id")
    .eq("stripe_account_id", accountId)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

const idOf = (x: string | { id: string } | null | undefined) => (typeof x === "string" ? x : (x?.id ?? null));

// refund.created / refund.updated / refund.failed
export async function handleRefundEvent(refund: Stripe.Refund, accountId: string): Promise<void> {
  const db = getAdminClient();
  const ourRefundId = refund.metadata?.refund_id;
  const done = refund.status === "succeeded" || refund.status === "pending";
  const failed = refund.status === "failed" || refund.status === "canceled";

  // A refund the app started: just make sure our record matches Stripe.
  if (ourRefundId) {
    if (done) {
      const { error } = await db.rpc("finish_refund", { p_refund_id: ourRefundId, p_stripe_refund_id: refund.id });
      if (error && !error.message.includes("cannot finish")) throw new Error(`finish_refund: ${error.message}`);
    } else if (failed) {
      const { error } = await db.rpc("fail_refund", { p_refund_id: ourRefundId, p_error: `Stripe refund ${refund.status}` });
      if (error) throw new Error(`fail_refund: ${error.message}`);
    }
    return;
  }

  // A refund made directly in the provider's Stripe dashboard.
  const providerId = await providerForAccount(accountId);
  const paymentIntent = idOf(refund.payment_intent);
  if (!providerId || !paymentIntent) {
    console.warn(`refund ${refund.id}: no matching provider or payment, ignored`);
    return;
  }
  if (failed) {
    // rare: a dashboard refund that later failed. Don't guess; flag it for a person.
    await db.from("audit_log").insert({
      provider_id: providerId,
      action: "refund.external_failed",
      entity: "stripe_refund",
      entity_id: refund.id,
      metadata: { payment_intent: paymentIntent, amount_cents: refund.amount },
    });
    console.error(`REVIEW: refund ${refund.id} made in Stripe has ${refund.status}; visits may need restoring by hand`);
    return;
  }
  if (!done) return;

  const { data, error } = await db
    .rpc("record_external_refund", {
      p_provider_id: providerId,
      p_payment_intent: paymentIntent,
      p_amount_cents: refund.amount,
      p_request_id: `stripe:${refund.id}`,
      p_stripe_refund_id: refund.id,
      p_reason: "Refunded in Stripe",
    })
    .single<{ purchase_id: string; visits_removed: number; is_new: boolean }>();
  if (error) {
    if (error.message.includes("no purchase")) {
      console.warn(`refund ${refund.id}: payment isn't a package sale from this app, ignored`);
      return;
    }
    throw new Error(`record_external_refund: ${error.message}`);
  }
  if (data.is_new) console.log(`refund ${refund.id} made in Stripe: removed ${data.visits_removed} visit(s)`);
}

// charge.dispute.created / charge.dispute.closed
export async function handleDisputeEvent(dispute: Stripe.Dispute, accountId: string, type: string): Promise<void> {
  const db = getAdminClient();
  const providerId = await providerForAccount(accountId);
  const paymentIntent = idOf(dispute.payment_intent);
  if (!providerId || !paymentIntent) {
    console.warn(`dispute ${dispute.id}: no matching provider or payment, ignored`);
    return;
  }
  // Stripe often sends "dispute opened" at the same moment as "payment completed", so the
  // purchase may not be recorded yet. Record the dispute against the Stripe payment anyway;
  // the overview matches it to the purchase by payment id.
  const { data: purchase } = await db
    .from("purchases")
    .select("id")
    .eq("provider_id", providerId)
    .eq("stripe_payment_intent_id", paymentIntent)
    .maybeSingle<{ id: string }>();

  const opened = type === "charge.dispute.created";
  const action = opened ? "dispute.opened" : "dispute.closed";
  // one audit row per dispute and stage, even if Stripe resends
  const { data: seen } = await db
    .from("audit_log")
    .select("id")
    .eq("provider_id", providerId)
    .eq("action", action)
    .eq("entity_id", dispute.id)
    .limit(1);
  if (!seen?.length) {
    await db.from("audit_log").insert({
      provider_id: providerId,
      action,
      entity: "dispute",
      entity_id: dispute.id,
      metadata: {
        purchase_id: purchase?.id ?? null,
        payment_intent: paymentIntent,
        amount_cents: dispute.amount,
        reason: dispute.reason,
        status: dispute.status,
      },
    });
  }

  // A lost dispute means the money went back to the client: take the visits too.
  if (!opened && dispute.status === "lost") {
    // fail on purpose if the purchase isn't recorded yet, so Stripe retries this later
    if (!purchase) throw new Error(`dispute ${dispute.id} lost but its purchase isn't recorded yet`);
    const { error } = await db.rpc("record_external_refund", {
      p_provider_id: providerId,
      p_payment_intent: paymentIntent,
      p_amount_cents: dispute.amount,
      p_request_id: `dispute:${dispute.id}`,
      p_stripe_refund_id: null,
      p_reason: "Card dispute lost",
    });
    if (error) throw new Error(`record_external_refund (dispute): ${error.message}`);
    console.log(`dispute ${dispute.id} lost: unused visits removed`);
  }
}

// account.updated: e.g. Stripe paused payments pending documents, or turned them back on
export async function handleAccountEvent(accountId: string): Promise<void> {
  const providerId = await providerForAccount(accountId);
  if (providerId) await syncAccountStatus(providerId);
}
