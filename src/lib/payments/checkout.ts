import "server-only";
import { timingSafeEqual } from "node:crypto";
import type Stripe from "stripe";
import { platformFeePercent } from "@/config/payments";
import { requireEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { getAdminClient } from "@/lib/supabase/admin";

// The public purchase flow. Clients never touch the database: the server reads with the
// service role after its own checks (hard rule 6), and nothing about the client is saved
// until Stripe confirms the payment (hard rule 1, minimal data).

export type PublicProvider = {
  id: string;
  slug: string;
  display_name: string;
  brand_color: string;
  logo_path: string | null;
  vocab_singular: string;
  vocab_plural: string;
  pass_label: string;
  page_access: "public" | "private";
  private_access_key: string;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  terms_text: string;
  terms_version: number;
  // the practice's own contact details (public business info), shown in the footer
  office_address: string | null;
  office_phone: string | null;
  office_website: string | null;
  usual_price_cents: number | null; // regular single-visit price, for savings tags
};

export type PublicPackage = {
  id: string;
  name: string;
  description: string | null;
  visits: number;
  price_cents: number;
  expires_days: number | null;
};

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// The provider behind /{slug}, or null if it doesn't exist OR the private key is wrong
// (both look the same, so a private page's existence isn't revealed).
export async function loadPublicProvider(slug: string, key: string | undefined): Promise<PublicProvider | null> {
  const { data } = await getAdminClient()
    .from("providers")
    .select(
      "id, slug, display_name, brand_color, logo_path, vocab_singular, vocab_plural, pass_label, page_access, private_access_key, stripe_account_id, stripe_charges_enabled, terms_text, terms_version, office_address, office_phone, office_website, usual_price_cents",
    )
    .eq("slug", slug.toLowerCase())
    .maybeSingle<PublicProvider>();
  if (!data) return null;
  if (data.page_access === "private" && !(key && sameSecret(key, data.private_access_key))) return null;
  return data;
}

// Why a provider can't sell yet, or null if they can.
export function notSellingReason(p: PublicProvider): string | null {
  if (!p.stripe_account_id || !p.stripe_charges_enabled) return "payments aren't set up yet";
  if (!p.terms_text.trim()) return "package terms haven't been added yet";
  return null;
}

export async function loadActivePackages(providerId: string): Promise<PublicPackage[]> {
  const { data, error } = await getAdminClient()
    .from("package_templates")
    .select("id, name, description, visits, price_cents, expires_days")
    .eq("provider_id", providerId)
    .eq("active", true)
    .order("sort_order")
    .returns<PublicPackage[]>();
  if (error) throw new Error(`could not load packages: ${error.message}`);
  return data;
}

// What we carry through Stripe so the webhook can record the sale once it's paid.
type CheckoutMetadata = {
  provider_id: string;
  package_template_id: string;
  package_name: string;
  visits: string;
  expires_days: string; // "" = never
  terms_version: string;
  terms_accepted_at: string;
  full_name: string;
  email: string;
};

export async function createCheckout(args: {
  provider: PublicProvider;
  pkg: PublicPackage;
  fullName: string;
  email: string;
  cancelUrl: string;
}): Promise<string> {
  const { provider, pkg, fullName, email, cancelUrl } = args;
  const site = requireEnv("SITE_URL");
  const metadata: CheckoutMetadata = {
    provider_id: provider.id,
    package_template_id: pkg.id,
    package_name: pkg.name,
    visits: String(pkg.visits),
    expires_days: pkg.expires_days === null ? "" : String(pkg.expires_days),
    terms_version: String(provider.terms_version),
    terms_accepted_at: new Date().toISOString(),
    full_name: fullName,
    email,
  };
  const unit = pkg.visits === 1 ? provider.vocab_singular : provider.vocab_plural;

  // Direct charge on the provider's own Stripe account: the money lands with them,
  // and our platform fee is taken automatically (hard rule 4).
  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pkg.price_cents,
            product_data: { name: `${pkg.name}: ${pkg.visits} ${unit}` },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: Math.round((pkg.price_cents * platformFeePercent) / 100),
      },
      metadata,
      success_url: `${site}/${provider.slug}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    },
    { stripeAccount: provider.stripe_account_id! },
  );
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export type CompletedCheckout = { purchaseId: string; visitAccountId: string; credentialId: string; isNew: boolean };

// Called by the webhook for a paid checkout.session.completed on a connected account.
export async function recordPaidCheckout(session: Stripe.Checkout.Session, connectedAccountId: string): Promise<CompletedCheckout> {
  const m = (session.metadata ?? {}) as Partial<CheckoutMetadata>;
  if (!m.provider_id) throw new Error(`checkout ${session.id} has no provider_id`);

  // the event must come from the Stripe account that belongs to that provider
  const db = getAdminClient();
  const { data: provider } = await db
    .from("providers")
    .select("id, stripe_account_id")
    .eq("id", m.provider_id)
    .maybeSingle<{ id: string; stripe_account_id: string | null }>();
  if (!provider || provider.stripe_account_id !== connectedAccountId) {
    throw new Error(`checkout ${session.id} does not match provider ${m.provider_id}`);
  }

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const { data, error } = await db
    .rpc("complete_checkout", {
      p_provider_id: provider.id,
      p_session_id: session.id,
      p_payment_intent: paymentIntent ?? null,
      p_full_name: m.full_name ?? "",
      p_email: m.email ?? session.customer_details?.email ?? "",
      p_template_id: m.package_template_id || null,
      p_package_name: m.package_name ?? "Package",
      p_visits: Number(m.visits),
      p_price_cents: session.amount_total ?? 0, // what was actually charged
      p_currency: session.currency ?? "usd",
      p_expires_days: m.expires_days ? Number(m.expires_days) : null,
      p_terms_version: Number(m.terms_version),
      p_terms_accepted_at: m.terms_accepted_at ?? new Date().toISOString(),
    })
    .single<{ purchase_id: string; visit_account_id: string; credential_id: string; is_new: boolean }>();
  if (error) throw new Error(`complete_checkout failed: ${error.message}`);
  return {
    purchaseId: data.purchase_id,
    visitAccountId: data.visit_account_id,
    credentialId: data.credential_id,
    isNew: data.is_new,
  };
}
