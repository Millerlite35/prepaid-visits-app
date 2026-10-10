import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

// The "confirm your email" link lands here with a one-time code.
// Swap it for a login session, then go to the dashboard. The destination is fixed
// (no ?next= parameter) so this link can't be abused to redirect people elsewhere.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.redirect(new URL("/auth/error", request.url));
}
