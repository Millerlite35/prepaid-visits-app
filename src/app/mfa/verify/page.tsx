import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { requireSignedIn } from "@/lib/auth";
import { signOut } from "../../(auth)/actions";
import { verifySignIn } from "../actions";
import { CodeForm } from "../code-form";
import { PasskeySignIn } from "../passkey-sign-in";
import { listPasskeys, PASSKEYS_AVAILABLE } from "@/lib/passkeys";
import { PageSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: `Enter your code · ${brand.name}` };

export default function MfaVerifyPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Enter your code</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Open your authenticator app and enter the 6-digit code for {brand.name}.
      </p>
      <Suspense fallback={<PageSkeleton variant="fields" className="mt-6" />}>
        <VerifyGate />
      </Suspense>
    </main>
  );
}

async function VerifyGate() {
  await requireSignedIn();
  const passkeys = PASSKEYS_AVAILABLE ? await listPasskeys() : [];
  return (
    <>
      <div className="mt-6 space-y-4">
        <PasskeySignIn passkeys={passkeys.map((p) => ({ id: p.id, name: p.name }))} />
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
