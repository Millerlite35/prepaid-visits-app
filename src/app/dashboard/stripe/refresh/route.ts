import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth";
import { createOnboardingLink } from "@/lib/payments/connect";

// Stripe signup links expire quickly. Stripe sends the owner here to get a fresh one.
export async function GET(request: NextRequest) {
  const providerId = request.nextUrl.searchParams.get("provider") ?? "";
  const user = await requireOwner(providerId);
  return NextResponse.redirect(await createOnboardingLink(providerId, user.id, user.email));
}
