import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { requireUser } from "@/lib/auth";
import { BACKUP_CODE_COUNT, unusedBackupCodeCount } from "@/lib/backup-codes";
import { BackupCodesPanel } from "./backup-codes-panel";

export const metadata: Metadata = { title: `Security · ${brand.name}` };

export default function SecurityPage({ searchParams }: PageProps<"/dashboard/security">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href="/dashboard" className="text-sm underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-brand">Security</h1>
      <Suspense fallback={<p className="mt-6 text-sm">Loading…</p>}>
        <SecurityContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SecurityContent({ searchParams }: Pick<PageProps<"/dashboard/security">, "searchParams">) {
  const user = await requireUser();
  const unused = await unusedBackupCodeCount(user.id);
  const justSetUp = (await searchParams).setup === "1";

  return (
    <>
      <p className="mt-1 text-sm text-zinc-500">Signed in as {user.email}</p>

      {justSetUp && unused === 0 && (
        <p className="mt-6 rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          ✓ Two-step verification is on. One last step: make backup codes, in case you ever lose your phone.
        </p>
      )}

      <section className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-medium">Backup codes</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          If you lose the phone with your authenticator app, a backup code gets you back in. Each code works
          once. Using one removes your old authenticator so you can set up the new phone, and we email you
          when it happens.
        </p>
        <p className="mt-3 text-sm">
          {unused === 0 ? (
            <span className="font-medium text-amber-700 dark:text-amber-400">⚠ You don&apos;t have any backup codes yet.</span>
          ) : (
            <span>
              {unused} of {BACKUP_CODE_COUNT} codes unused.
              {unused <= 3 && <span className="font-medium text-amber-700 dark:text-amber-400"> Running low: make new ones.</span>}
            </span>
          )}
        </p>
        <BackupCodesPanel unused={unused} brandName={brand.name} />
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <h2 className="font-medium">Password</h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          To change it, sign out and use{" "}
          <Link href="/forgot-password" className="underline">
            Forgot password
          </Link>
          . You&apos;ll need your authenticator code (or a backup code).
        </p>
      </section>
    </>
  );
}
