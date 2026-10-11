import "server-only";
import { getStripe } from "@/lib/stripe";
import { getAdminClient } from "@/lib/supabase/admin";

// Refunds in two steps, so visits and money can never get out of step:
//   1. begin_refund (database): checks limits, removes the visits, records "pending"
//   2. Stripe refund on the provider's account, including our platform fee
//   3. finish_refund on success, or fail_refund (puts the visits back) on failure
// Callers must have checked the user is the provider's owner.

export type RefundOutcome = { ok: true; amountCents: number } | { ok: false; error: string };

function friendly(message: string): string {
  const unused = message.match(/only (\d+) unused visit/);
  if (unused) return `Only ${unused[1]} unused visit(s) are left on this purchase.`;
  if (message.includes("left to refund")) return "That's more than is left to refund on this purchase.";
  if (message.includes("can't be refunded")) return "This purchase can't be refunded.";
  if (message.includes("no Stripe payment")) return "This purchase wasn't paid through Stripe, so it can't be refunded here.";
  return "Couldn't start the refund. Please try again.";
}

export async function refundPurchase(args: {
  providerId: string;
  purchaseId: string;
  visits: number;
  amountCents: number;
  reason: string;
  requestId: string;
  userId: string;
}): Promise<RefundOutcome> {
  const db = getAdminClient();

  const { data: refundId, error: beginError } = await db.rpc("begin_refund", {
    p_provider_id: args.providerId,
    p_purchase_id: args.purchaseId,
    p_visits: args.visits,
    p_amount_cents: args.amountCents,
    p_reason: args.reason,
    p_request_id: args.requestId,
    p_user_id: args.userId,
  });
  if (beginError || !refundId) {
    console.warn("begin_refund refused:", beginError?.message);
    return { ok: false, error: friendly(beginError?.message ?? "") };
  }

  const [{ data: refund }, { data: purchase }, { data: provider }] = await Promise.all([
    db.from("refunds").select("status, amount_cents").eq("id", refundId).single<{ status: string; amount_cents: number }>(),
    db.from("purchases").select("stripe_payment_intent_id").eq("id", args.purchaseId).single<{ stripe_payment_intent_id: string }>(),
    db.from("providers").select("stripe_account_id").eq("id", args.providerId).single<{ stripe_account_id: string | null }>(),
  ]);
  if (refund?.status === "succeeded") return { ok: true, amountCents: refund.amount_cents }; // a repeated click
  if (!purchase?.stripe_payment_intent_id || !provider?.stripe_account_id) {
    await db.rpc("fail_refund", { p_refund_id: refundId, p_error: "missing Stripe payment or account" });
    return { ok: false, error: "This purchase can't be refunded through Stripe." };
  }

  try {
    const stripeRefund = await getStripe().refunds.create(
      {
        payment_intent: purchase.stripe_payment_intent_id,
        amount: refund?.amount_cents ?? args.amountCents,
        refund_application_fee: true, // our platform fee goes back too, in proportion
        reason: "requested_by_customer",
        metadata: { refund_id: String(refundId), provider_id: args.providerId, purchase_id: args.purchaseId },
      },
      { stripeAccount: provider.stripe_account_id, idempotencyKey: `refund-${refundId}` },
    );
    if (stripeRefund.status === "failed" || stripeRefund.status === "canceled") {
      throw new Error(`Stripe refund ${stripeRefund.status}: ${stripeRefund.failure_reason ?? "unknown"}`);
    }
    const { error: finishError } = await db.rpc("finish_refund", { p_refund_id: refundId, p_stripe_refund_id: stripeRefund.id });
    if (finishError) {
      // money was refunded; the record will say pending until fixed. Shout in the logs.
      console.error(`REFUND ${refundId} PAID BY STRIPE (${stripeRefund.id}) BUT NOT MARKED FINISHED:`, finishError.message);
    }
    return { ok: true, amountCents: stripeRefund.amount };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`refund ${refundId} failed at Stripe:`, message);
    await db.rpc("fail_refund", { p_refund_id: refundId, p_error: message });
    return { ok: false, error: "Stripe couldn't process the refund, so nothing was changed. Please try again later." };
  }
}
