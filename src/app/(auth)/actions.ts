"use server";

import { redirect } from "next/navigation";
import { requireEnv } from "@/lib/env";
import { allow, clientIp, LIMITS } from "@/lib/rate-limit";
import { createSessionClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string };

const MIN_PASSWORD_LENGTH = 12;

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  // Supabase also limits sign-ins; this stops password guessing from one machine early
  if (!(await allow("signin-ip", await clientIp(), LIMITS.signInPerIp))) {
    return { error: "Too many sign-in attempts. Please wait 10 minutes and try again." };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email first. Check your inbox for the link." };
    }
    // same message whether the email exists or not, so nobody can probe for accounts
    return { error: "That email and password don't match." };
  }
  redirect("/dashboard");
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email) return { error: "Enter your email." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.` };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${requireEnv("SITE_URL")}/auth/callback` },
  });
  if (error) return { error: error.message };
  return { message: "Check your email for a link to confirm your account." };
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/login");
}
