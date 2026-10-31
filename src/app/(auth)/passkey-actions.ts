"use server";

import { redirect } from "next/navigation";
import { authenticationOptions, finishAuthentication, passkeyErrorMessage, type PasskeyOptions } from "@/lib/passkeys";
import { allow, clientIp, LIMITS } from "@/lib/rate-limit";
import { saveRemember } from "@/lib/session-trust";
import { createSessionClient } from "@/lib/supabase/server";

export type PasskeyLoginStart = PasskeyOptions | { error: string };

// "Sign in with a passkey": one Face ID / fingerprint / PIN check signs the person in fully
// (it counts as two-step: migration 0020, requireUser, docs/passkey-signin-plan.md).
export async function startPasskeyLogin(): Promise<PasskeyLoginStart> {
  if (!(await allow("signin-ip", await clientIp(), LIMITS.signInPerIp))) {
    return { error: "Too many sign-in attempts. Please wait 10 minutes and try again." };
  }
  try {
    return await authenticationOptions();
  } catch (e) {
    return { error: passkeyErrorMessage(e) };
  }
}

export async function finishPasskeyLogin(challengeId: string, credential: unknown, remember: boolean): Promise<{ error: string }> {
  try {
    const accessToken = await finishAuthentication(challengeId, credential);
    // "Remember this device": 30 days instead of 12 hours, like the code form
    const supabase = await createSessionClient();
    const { data } = await supabase.auth.getClaims(accessToken);
    if (data?.claims) await saveRemember(data.claims, remember);
  } catch (e) {
    return { error: passkeyErrorMessage(e) };
  }
  redirect("/dashboard");
}
