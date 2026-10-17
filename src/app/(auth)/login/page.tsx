import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: `Sign in · ${brand.name}` };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold text-brand">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-500">For providers and their staff.</p>
      <Suspense>
        <RecoveredNotice searchParams={searchParams} />
      </Suspense>
      <AuthForm mode="signin" />
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

// After a backup code was used (see /mfa/recover)
async function RecoveredNotice({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  if ((await searchParams).recovered !== "1") return null;
  return (
    <p role="status" className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
      Backup code accepted and your old authenticator was removed. Sign in again, then set up your new phone.
    </p>
  );
}
