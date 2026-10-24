import { NextResponse, type NextRequest } from "next/server";
import { sessionExpired } from "@/lib/session-trust";
import { createSessionClient } from "@/lib/supabase/server";

// requireUser() sends expired sign-ins here (pages can't clear cookies while rendering).
// It only signs out a session that really has expired, so a link to this address can't
// be used to sign someone out.
export async function GET(request: NextRequest) {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (claims?.sub && claims.aal === "aal2" && !(await sessionExpired(claims))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (claims?.sub && claims.aal === "aal2") await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/login?expired=1", request.url));
}
