"use server";

import { redirect } from "next/navigation";
import { requireSignedIn } from "@/lib/auth";
import { looksLikeBackupCode, redeemBackupCode, removeAuthenticator, unusedBackupCodeCount } from "@/lib/backup-codes";
import { requireEnv } from "@/lib/env";
import { allow, clientIp, LIMITS } from "@/lib/rate-limit";
import { createSessionClient } from "@/lib/supabase/server";

// Forgot password. Two safeguards:
//   * the request page never says whether an email has an account
//   * setting the new password also needs the authenticator code, so someone who only
//     got into the person's EMAIL still can't take over the account

export type PasswordState = { error?: string; message?: string };

const MIN_PASSWORD_LENGTH = 12;

export async function requestPasswordReset(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter your email address." };
  if (!(await allow("reset-ip", await clientIp(), LIMITS.resetPerIp))) {
    return { error: "Too many requests. Please wait a few minutes and try again." };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${requireEnv("SITE_URL")}/auth/reset`,
  });
  // Only a rate limit is worth telling them about; anything else gets the same answer.
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
    return { error: "Too many requests. Please wait a few minutes and try again." };
  }
  if (error) console.warn("password reset request:", error.code, error.message);
  return {
    message:
      "If an account exists for that email, we've sent a link to reset your password. Open it in this same browser. It expires in an hour.",
  };
}

export async function setNewPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await requireSignedIn(); // the email link signed them in (password step only)
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const rawCode = String(formData.get("code") ?? "").trim();
  const code = rawCode.replace(/\s/g, "");
  if (password.length < MIN_PASSWORD_LENGTH) return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createSessionClient();

  // If they use an authenticator (all staff do once set up), require its code first.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];
  let usedBackupCode = false;
  if (factor) {
    if (/^\d{6}$/.test(code)) {
      const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (mfaError) {
        return { error: "That code didn't work. Codes change every 30 seconds, so try the newest one." };
      }
    } else if (looksLikeBackupCode(rawCode)) {
      // lost phone AND forgotten password: a backup code stands in for the authenticator
      const result = await redeemBackupCode(user.id, rawCode);
      if (result === "too_many") return { error: "Too many tries. Please wait an hour, or contact support." };
      if (result === "wrong") return { error: "That backup code didn't work. Each code can only be used once." };
      usedBackupCode = true;
    } else {
      return { error: "Enter the 6-digit code from your authenticator app, or a backup code." };
    }
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "That's your current password. Choose a new one." };
    if (error.code === "weak_password") return { error: "That password is too easy to guess. Try a longer one." };
    console.error("update password failed:", error.code, error.message);
    return { error: "Couldn't change your password. Please request a new link and try again." };
  }
  if (usedBackupCode) {
    // removing the old authenticator signs them out everywhere; they sign in with the new
    // password and set up their new phone
    try {
      await removeAuthenticator(user.id, user.email, await unusedBackupCodeCount(user.id));
    } catch (e) {
      console.error("remove authenticator after backup code failed:", e instanceof Error ? e.message : e);
      return { error: "Your password was changed but something went wrong. Please contact support." };
    }
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?recovered=1");
  }
  // sign out any other devices, in case someone else was signed in
  await supabase.auth.signOut({ scope: "others" });
  redirect("/dashboard");
}
