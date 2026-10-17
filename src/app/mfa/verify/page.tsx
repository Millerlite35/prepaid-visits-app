import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { requireSignedIn } from "@/lib/auth";
import { signOut } from "../../(auth)/actions";
import { verifySignIn } from "../actions";
import { CodeForm } from "../code-form";

export const metadata: Metadata = { title: `Enter your code · ${brand.name}` };

export default function MfaVerifyPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold text-brand">Enter your code</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Open your authenticator app and enter the 6-digit code for {brand.name}.
      </p>
      <Suspense fallback={<p className="mt-6 text-sm">Loading…</p>}>
        <VerifyGate />
      </Suspense>
    </main>
  );
}

async function VerifyGate() {
  await requireSignedIn();
  return (
    <>
      <div className="mt-6">
        <CodeForm action={verifySignIn} submitLabel="Continue" />
      </div>
      <p className="mt-6 text-sm">
        <Link href="/mfa/recover" className="underline">
          Lost your phone? Use a backup code
        </Link>
      </p>
      <form action={signOut} className="mt-8">
        <button className="text-sm underline">Sign out</button>
      </form>
    </>
  );
}
