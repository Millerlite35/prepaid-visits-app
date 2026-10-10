"use server";

import { redirect } from "next/navigation";
import { requireEnv } from "@/lib/env";
import { createCheckout, loadActivePackages, loadPublicProvider, notSellingReason } from "@/lib/payments/checkout";

export type PurchaseState = { error?: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// "Continue to payment": check everything again on the server, then send the client to
// Stripe Checkout. Nothing is saved yet; the webhook records the sale once it's paid.
export async function startCheckout(
  slug: string,
  key: string | undefined,
  _prev: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  const provider = await loadPublicProvider(slug, key);
  if (!provider || notSellingReason(provider)) return { error: "This page isn't taking purchases right now." };

  const packageId = String(formData.get("packageId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim().replace(/\s+/g, " ");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const acceptedVersion = Number(formData.get("termsVersion"));

  const pkg = (await loadActivePackages(provider.id)).find((p) => p.id === packageId);
  if (!pkg) return { error: "Choose a package." };
  if (!fullName || fullName.length > 100) return { error: "Enter your full name." };
  if (!EMAIL.test(email) || email.length > 254) return { error: "Enter a valid email address." };
  if (formData.get("acceptTerms") !== "on") return { error: "Please read and accept the terms to continue." };
  if (acceptedVersion !== provider.terms_version) {
    return { error: "The terms were just updated. Please refresh the page and review them again." };
  }

  const site = requireEnv("SITE_URL");
  const cancelUrl = `${site}/${provider.slug}${key ? `?key=${encodeURIComponent(key)}` : ""}`;

  let url: string;
  try {
    url = await createCheckout({ provider, pkg, fullName, email, cancelUrl });
  } catch (e) {
    console.error("create checkout failed:", e instanceof Error ? e.message : e);
    return { error: "Couldn't start the payment. Please try again in a minute." };
  }
  redirect(url);
}
