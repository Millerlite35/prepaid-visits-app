import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ProviderHeader } from "@/components/provider-header";
import { brand } from "@/config/brand";
import { describeExpiry } from "@/lib/packages";
import { getStripe } from "@/lib/stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import { AutoRefresh } from "./auto-refresh";

export const metadata: Metadata = { title: "Thank you", robots: { index: false, follow: false } };

// Where Stripe sends the client after paying. The Checkout session id in the link is
// long and unguessable; we only show it to confirm the purchase, never the client's details.
export default function ThanksPage(props: PageProps<"/[slug]/thanks">) {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <ThanksContent {...props} />
      </Suspense>
      <p className="mt-12 text-center text-xs text-zinc-400">Powered by {brand.name}</p>
    </main>
  );
}

type ProviderRow = {
  id: string;
  display_name: string;
  brand_color: string;
  logo_path: string | null;
  vocab_singular: string;
  vocab_plural: string;
  stripe_account_id: string | null;
};
type PurchaseRow = { package_name: string; visits_purchased: number; expires_days: number | null; visit_account_id: string };

async function ThanksContent({ params, searchParams }: PageProps<"/[slug]/thanks">) {
  await connection();
  const { slug } = await params;
  const query = await searchParams;
  const sessionId = typeof query.session_id === "string" ? query.session_id : "";
  if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) notFound();

  const db = getAdminClient();
  const { data: provider } = await db
    .from("providers")
    .select("id, display_name, brand_color, logo_path, vocab_singular, vocab_plural, stripe_account_id")
    .eq("slug", slug.toLowerCase())
    .maybeSingle<ProviderRow>();
  if (!provider?.stripe_account_id) notFound();

  // the session must belong to this provider's Stripe account and be paid
  let paid = false;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {}, { stripeAccount: provider.stripe_account_id });
    paid = session.payment_status === "paid";
  } catch {
    notFound();
  }

  const heading = <ProviderHeader name={provider.display_name} color={provider.brand_color} logoPath={provider.logo_path} />;

  if (!paid) {
    return (
      <>
        {heading}
        <p className="mt-6 text-sm">Your payment hasn&apos;t gone through yet. If you were charged, please contact {provider.display_name}.</p>
      </>
    );
  }

  const { data: purchase } = await db
    .from("purchases")
    .select("package_name, visits_purchased, expires_days, visit_account_id")
    .eq("stripe_checkout_session_id", sessionId)
    .eq("provider_id", provider.id)
    .maybeSingle<PurchaseRow>();

  // Stripe has confirmed the payment to the client, but its message to our server
  // (the webhook) can take a few seconds. Check again shortly.
  if (!purchase) {
    return (
      <>
        {heading}
        <p className="mt-6 font-medium">Payment received. Thank you!</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Setting up your {provider.vocab_plural}…</p>
        <AutoRefresh seconds={3} />
      </>
    );
  }

  const [{ data: balance }, { data: pass }] = await Promise.all([
    db
      .from("account_balances")
      .select("usable_visits")
      .eq("visit_account_id", purchase.visit_account_id)
      .maybeSingle<{ usable_visits: number }>(),
    db
      .from("credentials")
      .select("token")
      .eq("visit_account_id", purchase.visit_account_id)
      .eq("kind", "wallet")
      .eq("status", "active")
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ token: string }>(),
  ]);
  const unit = purchase.visits_purchased === 1 ? provider.vocab_singular : provider.vocab_plural;

  return (
    <>
      {heading}
      <p className="mt-6 text-lg font-medium">You&apos;re all set. Thank you!</p>
      <div className="mt-4 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <p>
          <span className="font-medium">{purchase.package_name}</span>: {purchase.visits_purchased} {unit}
        </p>
        <p className="text-zinc-500">{describeExpiry(purchase.expires_days)}</p>
        {balance && (
          <p className="mt-2">
            {provider.vocab_plural.charAt(0).toUpperCase() + provider.vocab_plural.slice(1)} available now:{" "}
            <span className="font-semibold">{balance.usable_visits}</span>
          </p>
        )}
      </div>
      {pass && (
        <a
          href={`/pass/${pass.token}`}
          className="mt-6 block rounded-md px-4 py-3 text-center font-medium text-white"
          style={{ backgroundColor: provider.brand_color }}
        >
          Open your pass
        </a>
      )}
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        We&apos;ve also emailed your pass to you. Show its code at each {provider.vocab_singular} to check in.
      </p>
    </>
  );
}
