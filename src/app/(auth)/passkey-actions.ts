"use server";

import { redirect } from "next/navigation";
import { authenticationOptions, finishAuthentication, passkeyErrorMessage, type PasskeyOptions } from "@/lib/passkeys";
import { allow, clientIp, LIMITS } from "@/lib/rate-limit";

export type PasskeyLoginStart = PasskeyOptions | { error: string };

// "Sign in with a passkey" instead of email + password. Stage 1: the session is aal1, so
// /dashboard sends the person on to the 6-digit code (docs/passkey-signin-plan.md).
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

export async function finishPasskeyLogin(challengeId: string, credential: unknown): Promise<{ error: string }> {
  try {
    await finishAuthentication(challengeId, credential);
  } catch (e) {
    return { error: passkeyErrorMessage(e) };
  }
  redirect("/dashboard");
}
