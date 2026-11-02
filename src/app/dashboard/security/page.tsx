import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { requireUser } from "@/lib/auth";
import { BACKUP_CODE_COUNT, unusedBackupCodeCount } from "@/lib/backup-codes";
import { listPasskeys } from "@/lib/passkeys";
import { BackupCodesPanel } from "./backup-codes-panel";
import { PasskeysPanel } from "./passkeys-panel";
import { Card, Notice, PageSkeleton, Section, Sections } from "@/components/ui";
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
      {justSetUp && unused === 0 && (
        <Notice tone="success" boxed className="mt-6">
          Two-step verification is on. One last step: make backup codes, in case you ever lose your phone.
        </Notice>
      )}

      <Card title="Signing in" padded={false} className="mt-6">
        <Sections>
          {passkeys && (
            <Section
              title="Passkeys"
              description="Sign in with Face ID or fingerprint. Not on shared computers."
            >
              <PasskeysPanel passkeys={passkeys} />
            </Section>
          )}

          <Section
            title="Backup codes"
            description="For when you lose your phone."
          >
            <p className="text-sm">
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
          </Section>

          <Section title="Password">
            <p className="text-sm text-ink-muted">
              To change it, sign out and use{" "}
              <Link href="/forgot-password" className="underline">
                Forgot password
              </Link>
              . You&apos;ll need your authenticator code (or a backup code).
            </p>
          </Section>
        </Sections>
      </Card>
    </>
  );
}
