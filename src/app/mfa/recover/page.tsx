import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { requireSignedIn } from "@/lib/auth";
import { signOut } from "../../(auth)/actions";
import { BackupCodeForm } from "./backup-code-form";

export const metadata: Metadata = { title: `Use a backup code · ${brand.name}` };

export default function MfaRecoverPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold text-brand">Lost your phone?</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Enter one of the backup codes you saved when you set up two-step verification. Your old
        authenticator will be removed, and you&apos;ll sign in again to set up your new phone.
      </p>
      <Suspense fallback={<p className="mt-6 text-sm">Loading…</p>}>
        <RecoverGate />
      </Suspense>
    </main>
  );
}

async function RecoverGate() {
  await requireSignedIn(); // password step done; this replaces the authenticator code
  const supportEmail = process.env.SUPPORT_EMAIL;
  return (
    <>
      <div className="mt-6">
        <BackupCodeForm />
      </div>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        No backup codes?{" "}
        {supportEmail ? (
          <>
            Email{" "}
            <a href={`mailto:${supportEmail}`} className="underline">
              {supportEmail}
            </a>{" "}
            from this account&apos;s email address and we&apos;ll help.
          </>
        ) : (
          "Contact support and we'll help."
        )}{" "}
        <Link href="/mfa/verify" className="underline">
          Back to code entry
        </Link>
      </p>
      <form action={signOut} className="mt-8">
        <button className="text-sm underline">Sign out</button>
      </form>
    </>
  );
}
