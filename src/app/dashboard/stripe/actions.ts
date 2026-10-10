"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createOnboardingLink } from "@/lib/payments/connect";

// "Connect Stripe" / "Continue Stripe setup" button: send the owner to Stripe's signup.
export async function connectStripe(formData: FormData): Promise<void> {
  const providerId = String(formData.get("providerId") ?? "");
  const user = await requireOwner(providerId);

  let url: string;
  try {
    url = await createOnboardingLink(providerId, user.id, user.email);
  } catch (e) {
    console.error("Stripe connect failed:", e instanceof Error ? e.message : e);
    redirect("/dashboard/stripe/problem");
  }
  redirect(url);
}
