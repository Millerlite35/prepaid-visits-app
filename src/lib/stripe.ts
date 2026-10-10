import "server-only";
import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

let stripe: Stripe | undefined;

// Server-side Stripe client. Refuses live keys unless ALLOW_LIVE_PAYMENTS=true, so real
// money can't move by accident before the legal and hosting steps are done (hard rule 7).
export function getStripe(): Stripe {
  if (!stripe) {
    const key = requireEnv("STRIPE_SECRET_KEY");
    const isLive = key.startsWith("sk_live_") || key.startsWith("rk_live_");
    if (isLive && process.env.ALLOW_LIVE_PAYMENTS !== "true") {
      throw new Error("STRIPE_SECRET_KEY is a LIVE key. Use the test-mode key (sk_test_...) until launch.");
    }
    stripe = new Stripe(key);
  }
  return stripe;
}
