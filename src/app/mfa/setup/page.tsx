import { Suspense } from "react";
import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { requireSignedIn } from "@/lib/auth";
import { signOut } from "../../(auth)/actions";
import { SetupFlow } from "./setup-flow";
import { PageSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: `Set up two-step verification · ${brand.name}` };

export default function MfaSetupPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Set up two-step verification</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Each sign-in will also ask for a code from your phone, so a stolen password alone
        can&apos;t open your account.
      </p>
      <Suspense fallback={<PageSkeleton variant="fields" className="mt-6" />}>
        <SetupGate />
      </Suspense>
    </main>
  );
}

async function SetupGate() {
  await requireSignedIn();
  return (
    <>
      <SetupFlow />
      <form action={signOut} className="mt-8">
        <button className="text-sm underline">Sign out</button>
      </form>
    </>
  );
}
