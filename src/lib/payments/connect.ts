import "server-only";
import type Stripe from "stripe";
import { connectAccountStyle } from "@/config/payments";
import { requireEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { getAdminClient } from "@/lib/supabase/admin";

// Stripe Connect for providers: each business gets its own connected Stripe account,
// so client payments land with the provider, never with us (hard rule 4).
// Uses Stripe's Accounts v2 API (Stripe refuses v1 account creation for new platforms).
// Callers must have already checked the user is an owner of the provider.

type AccountStyle = Pick<Stripe.V2.Core.AccountCreateParams, "dashboard"> & {
  responsibilities: Stripe.V2.Core.AccountCreateParams.Defaults.Responsibilities;
};

const ACCOUNT_STYLES: Record<typeof connectAccountStyle, AccountStyle> = {
  // provider's own full Stripe account; Stripe collects its fees from them and covers losses
  full: { dashboard: "full", responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
  // Express dashboard; WE collect fees and are liable for losses
  express: { dashboard: "express", responsibilities: { fees_collector: "application", losses_collector: "application" } },
};

type ProviderPayments = { id: string; display_name: string; stripe_account_id: string | null };

async function loadProvider(providerId: string): Promise<ProviderPayments> {
  const { data, error } = await getAdminClient()
    .from("providers")
    .select("id, display_name, stripe_account_id")
    .eq("id", providerId)
    .single<ProviderPayments>();
  if (error) throw new Error(`provider ${providerId} not found: ${error.message}`);
  return data;
}

// The provider's Stripe account id, creating the account the first time.
async function ensureConnectedAccount(provider: ProviderPayments, actorId: string, email: string): Promise<string> {
  if (provider.stripe_account_id) return provider.stripe_account_id;

  const style = ACCOUNT_STYLES[connectAccountStyle];
  const account = await getStripe().v2.core.accounts.create(
    {
      display_name: provider.display_name,
      contact_email: email || undefined,
      dashboard: style.dashboard,
      identity: { country: "us" },
      defaults: { responsibilities: style.responsibilities },
      // "merchant" = the provider is the seller of record and takes payments directly
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      metadata: { provider_id: provider.id },
    },
    // a double click can't create two Stripe accounts for one business
    { idempotencyKey: `connect-account-v2-${provider.id}` },
  );

  const db = getAdminClient();
  const { data: saved, error } = await db
    .from("providers")
    .update({ stripe_account_id: account.id })
    .eq("id", provider.id)
    .is("stripe_account_id", null)
    .select("stripe_account_id")
    .maybeSingle<{ stripe_account_id: string }>();
  if (error) throw new Error(`could not save Stripe account: ${error.message}`);
  if (!saved) return (await loadProvider(provider.id)).stripe_account_id!; // another request saved first

  await db.from("audit_log").insert({
    provider_id: provider.id,
    actor_id: actorId,
    action: "stripe.account_created",
    entity: "provider",
    entity_id: provider.id,
    metadata: { stripe_account_id: account.id, style: connectAccountStyle },
  });
  return account.id;
}

// A one-time link to Stripe's own signup pages for this provider.
export async function createOnboardingLink(providerId: string, actorId: string, email: string): Promise<string> {
  const provider = await loadProvider(providerId);
  const accountId = await ensureConnectedAccount(provider, actorId, email);
  const site = requireEnv("SITE_URL");
  const link = await getStripe().v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        refresh_url: `${site}/dashboard/stripe/refresh?provider=${providerId}`,
        return_url: `${site}/dashboard/stripe/return?provider=${providerId}`,
      },
    },
  });
  return link.url;
}

// Ask Stripe whether the provider can take card payments yet, and save the answer.
export async function syncAccountStatus(providerId: string): Promise<void> {
  const provider = await loadProvider(providerId);
  if (!provider.stripe_account_id) return;
  const account = await getStripe().v2.core.accounts.retrieve(provider.stripe_account_id, {
    include: ["configuration.merchant"],
  });
  const cardPayments = account.configuration?.merchant?.capabilities?.card_payments?.status;
  await getAdminClient()
    .from("providers")
    .update({ stripe_charges_enabled: cardPayments === "active" })
    .eq("id", providerId);
}
