import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { brand } from "@/config/brand";
import { IDLE_MINUTES } from "@/lib/idle";
import { passkeysEnabled } from "@/lib/passkeys";
import { AuthForm } from "../auth-form";
import { PasskeyLogin } from "../passkey-login";

export const metadata: Metadata = { title: `Sign in · ${brand.name}` };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h1>
      <Suspense>
        <RecoveredNotice searchParams={searchParams} />
      </Suspense>
      <AuthForm mode="signin" />
      <Suspense>
        <PasskeyGate />
      </Suspense>
      <p className="mt-4 text-sm">
        <Link href="/forgot-password" className="underline">
          Forgot password?
        </Link>
      </p>
      <p className="mt-2 text-sm">
        New here?{" "}
        <Link href="/signup" className="underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}

// The passkey button only while passkeys are switched on in Supabase (checked per request)
async function PasskeyGate() {
  await connection();
  return (await passkeysEnabled()) ? <PasskeyLogin /> : null;
}

// After a backup code was used (see /mfa/recover), or a sign-in ran out (/auth/expired)
async function RecoveredNotice({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  if (params.idle === "1") {
    return (
      <p role="status" className="mt-4 rounded-md bg-surface-muted p-3 text-sm text-ink">
        You were signed out after {IDLE_MINUTES} minutes without activity, to keep client details private. Sign in
        again to continue.
      </p>
    );
  }
  if (params.expired === "1") {
    return (
      <p role="status" className="mt-4 rounded-md bg-surface-muted p-3 text-sm text-ink">
        For security, you were signed out. Sign in again to continue.
      </p>
    );
  }
  if (params.recovered !== "1") return null;
  return (
    <p role="status" className="mt-4 rounded-md bg-success-soft p-3 text-sm text-success">
      Backup code accepted and your old authenticator was removed. Sign in again, then set up your new phone.
    </p>
  );
}
