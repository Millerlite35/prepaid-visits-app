import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

// The "reset your password" email link lands here with a one-time code. Swap it for a
// session, then go to the new-password page. The destination is fixed (no ?next=).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/reset-password", request.url));
  }
  return NextResponse.redirect(new URL("/auth/error", request.url));
}
