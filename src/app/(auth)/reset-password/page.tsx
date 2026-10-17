import { Suspense } from "react";
import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { requireSignedIn } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { NewPasswordForm } from "../password-forms";

export const metadata: Metadata = { title: `Choose a new password · ${brand.name}` };

// Reached from the reset email (via /auth/reset), which signs the person in for this step.
export default function ResetPasswordPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Choose a new password</h1>
      <Suspense fallback={<p className="mt-6 text-sm">Loading…</p>}>
        <ResetGate />
      </Suspense>
    </main>
  );
}

async function ResetGate() {
  await requireSignedIn(); // no session = the link wasn't used, or expired: back to sign in
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.mfa.listFactors();
  return <NewPasswordForm needsCode={(data?.totp.length ?? 0) > 0} />;
}
