import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth";
import { syncAccountStatus } from "@/lib/payments/connect";

// Stripe sends the owner back here after its signup pages (finished or not).
// The account is looked up from our database, never from the URL.
export async function GET(request: NextRequest) {
  const providerId = request.nextUrl.searchParams.get("provider") ?? "";
  await requireOwner(providerId);
  await syncAccountStatus(providerId);
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
