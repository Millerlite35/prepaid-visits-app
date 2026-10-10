import type Stripe from "stripe";
import { requireEnv } from "@/lib/env";
import { sendPassEmail } from "@/lib/pass-email";
import { recordPaidCheckout } from "@/lib/payments/checkout";
import { getStripe } from "@/lib/stripe";
import { getAdminClient } from "@/lib/supabase/admin";

// Stripe calls this when something happens on a provider's account (e.g. a client paid).
// Visits are granted ONLY here, after Stripe's signature proves the message is real.
// Returning an error makes Stripe retry later, so every step is safe to repeat.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (e) {
    console.warn("stripe webhook rejected:", e instanceof Error ? e.message : e);
    return new Response("bad signature", { status: 400 });
  }

  // de-duplicate: Stripe may deliver the same event more than once
  const db = getAdminClient();
  const { data: seen } = await db
    .from("stripe_events")
    .select("processed_at")
    .eq("id", event.id)
    .maybeSingle<{ processed_at: string | null }>();
  if (seen?.processed_at) return Response.json({ received: true, duplicate: true });
  if (!seen) await db.from("stripe_events").insert({ id: event.id, type: event.type });

  try {
    await handleEvent(event);
  } catch (e) {
    console.error(`stripe webhook ${event.type} ${event.id} failed:`, e instanceof Error ? e.message : e);
    return new Response("processing failed", { status: 500 }); // Stripe will retry
  }

  await db.from("stripe_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
  return Response.json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "paid") return; // card payments are paid immediately
      if (!event.account) throw new Error("checkout event without a connected account");
      const result = await recordPaidCheckout(session, event.account);
      console.log(`checkout ${session.id} recorded (purchase ${result.purchaseId}, new=${result.isNew})`);
      // Email the pass once. A failed email doesn't undo the purchase; it's logged instead.
      if (result.isNew) {
        const emailed = await sendPassEmail(result.purchaseId, result.credentialId);
        console.log(`pass email for purchase ${result.purchaseId}: ${emailed}`);
      }
      return;
    }
    default:
      return; // not needed yet
  }
}
