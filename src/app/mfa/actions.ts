"use server";

import { redirect } from "next/navigation";
import { brand } from "@/config/brand";
import { requireSignedIn } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";

export type EnrollState = { factorId?: string; qrCode?: string; secret?: string; error?: string };
export type CodeState = { error?: string };

const BAD_CODE =
  "That code didn't work. Codes change every 30 seconds, so try the newest one. " +
  `If your app has more than one ${brand.name} entry, use the one you added last.`;

// Step 1 of setup: create a new authenticator secret and its QR code.
export async function startEnrollment(): Promise<EnrollState> {
  await requireSignedIn();
  const supabase = await createSessionClient();

  const { data: factors } = await supabase.auth.mfa.listFactors();
  if ((factors?.totp.length ?? 0) > 0) {
    return { error: "Two-step verification is already on. Sign in again and enter your code." };
  }
  // clear any half-finished setup so a fresh QR code can be made
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator app",
    issuer: brand.name,
  });
  if (error) return { error: "Couldn't start setup. Please try again." };

  const qr = data.totp.qr_code;
  return {
    factorId: data.id,
    qrCode: qr.startsWith("data:") ? qr : `data:image/svg+xml;utf-8,${encodeURIComponent(qr)}`,
    secret: data.totp.secret,
  };
}

// Step 2 of setup: the first code from the app proves it was set up correctly.
export async function confirmEnrollment(_prev: CodeState, formData: FormData): Promise<CodeState> {
  await requireSignedIn();
  const factorId = String(formData.get("factorId") ?? "");
  const code = readCode(formData);
  if (!factorId || !code) return { error: "Enter the 6-digit code from your app." };

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: BAD_CODE };
  redirect("/dashboard");
}

// Every sign-in after setup: password, then this code.
export async function verifySignIn(_prev: CodeState, formData: FormData): Promise<CodeState> {
  await requireSignedIn();
  const code = readCode(formData);
  if (!code) return { error: "Enter the 6-digit code from your app." };

  const supabase = await createSessionClient();
  const { data, error: listError } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp[0];
  if (listError || !factor) redirect("/mfa/setup");

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) {
    console.warn("two-step sign-in failed:", error.code, error.message, `(${data.totp.length} factor(s))`);
    return { error: BAD_CODE };
  }
  redirect("/dashboard");
}

function readCode(formData: FormData): string | null {
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}
