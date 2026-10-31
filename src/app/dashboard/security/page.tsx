import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { requireUser } from "@/lib/auth";
import { BACKUP_CODE_COUNT, unusedBackupCodeCount } from "@/lib/backup-codes";
import { listPasskeys } from "@/lib/passkeys";
import { BackupCodesPanel } from "./backup-codes-panel";
import { PasskeysPanel } from "./passkeys-panel";
import { Notice, PageSkeleton } from "@/components/ui";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: `Security · ${brand.name}` };

export default function SecurityPage({ searchParams }: PageProps<"/dashboard/security">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Security</h1>
      <Suspense fallback={<PageSkeleton variant="fields" className="mt-6" />}>
        <SecurityContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SecurityContent({ searchParams }: Pick<PageProps<"/dashboard/security">, "searchParams">) {
  const user = await requireUser();
  // null = passkeys switched off in Supabase (the panel is hidden then)
  const [unused, passkeys] = await Promise.all([unusedBackupCodeCount(user.id), listPasskeys().catch(() => null)]);
  const justSetUp = (await searchParams).setup === "1";

  return (
    <>
      <p className="mt-1 text-sm text-ink-muted">Signed in as {user.email}</p>

      {justSetUp && unused === 0 && (
        <Notice tone="success" boxed className="mt-6">
          Two-step verification is on. One last step: make backup codes, in case you ever lose your phone.
        </Notice>
      )}

      {passkeys && (
        <section className="mt-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="font-medium">Passkeys</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Sign in with Face ID, a fingerprint or your device PIN instead of your password. Add one on each phone or
            computer you use, but not on a shared front-desk device. For now you&apos;ll still enter your 6-digit code
            after it.
          </p>
          <PasskeysPanel passkeys={passkeys} />
        </section>
      )}

      <section className="mt-6 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-medium">Backup codes</h2>
        <p className="mt-1 text-sm text-ink-muted">
          If you lose the phone with your authenticator app, a backup code gets you back in. Each code works
          once. Using one removes your old authenticator so you can set up the new phone, and we email you
          when it happens.
        </p>
        <p className="mt-3 text-sm">
          {unused === 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-warning">
              <Icon name="alert" className="h-4 w-4" />
              You don&apos;t have any backup codes yet.
            </span>
          ) : (
            <span>
              {unused} of {BACKUP_CODE_COUNT} codes unused.
              {unused <= 3 && <span className="font-medium text-warning"> Running low: make new ones.</span>}
            </span>
          )}
        </p>
        <BackupCodesPanel unused={unused} brandName={brand.name} />
      </section>

      <section className="mt-6 rounded-xl border border-line p-4 text-sm">
        <h2 className="font-medium">Password</h2>
        <p className="mt-1 text-ink-muted">
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
