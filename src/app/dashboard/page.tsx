import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { InstallApp } from "@/components/install-app";
import { Badge, buttonClass, Callout, Card, EmptyState, PageHeader } from "@/components/ui";
import { brand } from "@/config/brand";
import { requireUser } from "@/lib/auth";
import { unusedBackupCodeCount } from "@/lib/backup-codes";
import { getAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { ROLE_LABELS } from "@/lib/staff";
import { acceptInvite } from "./invite-actions";
import { connectStripe } from "./stripe/actions";

export const metadata: Metadata = { title: `Dashboard · ${brand.name}` };

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
      <Suspense fallback={<p className="mt-4 text-sm">Loading…</p>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

type Membership = {
  provider_id: string;
  role: string;
  // null for scan-only staff: row-level security doesn't let them read business details
  providers: {
    id: string;
    display_name: string;
    slug: string;
    page_access: "public" | "private";
    private_access_key: string;
    stripe_account_id: string | null;
    stripe_charges_enabled: boolean;
  } | null;
};

async function DashboardContent() {
  const user = await requireUser();

  // Read as the signed-in person: row-level security limits this to their own businesses.
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("provider_members")
    .select(
      "provider_id, role, providers(id, display_name, slug, page_access, private_access_key, stripe_account_id, stripe_charges_enabled)",
    )
    .returns<Membership[]>();

  // Scan-only staff still need to see which business they're scanning for: look up just
  // the names, server-side, for memberships the user really has (read above).
  // open invitations for this user's email
  const { data: invites } = await getAdminClient()
    .from("staff_invites")
    .select("id, role, providers(display_name)")
    .eq("email", user.email.toLowerCase())
    .is("accepted_at", null)
    .is("cancelled_at", null)
    .gt("expires_at", new Date().toISOString())
    .returns<{ id: string; role: string; providers: { display_name: string } | null }[]>();

  const hidden = (data ?? []).filter((m) => !m.providers).map((m) => m.provider_id);
  const names = new Map<string, string>();
  if (hidden.length) {
    const { data: rows } = await getAdminClient()
      .from("providers")
      .select("id, display_name")
      .in("id", hidden)
      .returns<{ id: string; display_name: string }[]>();
    rows?.forEach((r) => names.set(r.id, r.display_name));
  }

  const backupCodesLeft = await unusedBackupCodeCount(user.id);

  const memberships = data ?? [];

  return (
    <>
      <PageHeader
        title="Your businesses"
        description={<>Signed in as {user.email}</>}
        actions={
          <Link href="/dashboard/new-business" className={buttonClass("secondary")}>
            Add a business
          </Link>
        }
      />

      {invites && invites.length > 0 && (
        <div className="mb-6">
          <Callout tone="green" title="Invitations">
            <ul className="space-y-3">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    <span className="font-medium">{i.providers?.display_name ?? "A business"}</span> invited you as{" "}
                    {ROLE_LABELS[i.role] ?? i.role}.
                  </span>
                  <form action={acceptInvite.bind(null, i.id)}>
                    <button className={buttonClass("primary", "sm")}>Join {i.providers?.display_name ?? "business"}</button>
                  </form>
                </li>
              ))}
            </ul>
          </Callout>
        </div>
      )}

      {error ? (
        <Callout tone="red">Couldn&apos;t load your businesses. Try refreshing.</Callout>
      ) : memberships.length === 0 ? (
        <Card>
          <EmptyState action={{ href: "/dashboard/new-business", label: "Create your business" }}>
            You&apos;re not part of a business yet.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {memberships.map((m) => {
            const p = m.providers;
            const base = `/dashboard/business/${m.provider_id}`;
            const manager = !!p && (m.role === "owner" || m.role === "manager");
            const name = p?.display_name ?? names.get(m.provider_id) ?? "A business";
            return (
              <Card key={m.provider_id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={manager ? base : `${base}/scan`} className="text-lg font-semibold text-ink hover:underline">
                      {name}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge>{ROLE_LABELS[m.role] ?? m.role.replace("_", " ")}</Badge>
                      {p && <PaymentsBadge provider={p} />}
                    </div>
                  </div>
                </div>
                {p && !p.stripe_charges_enabled && <PaymentsSetup provider={p} isOwner={m.role === "owner"} />}
                <div className="mt-4 flex flex-wrap gap-2">
                  {manager && (
                    <Link href={base} className={buttonClass("primary", "sm")}>
                      Open
                    </Link>
                  )}
                  <Link href={`${base}/scan`} className={buttonClass(manager ? "secondary" : "primary", "sm")}>
                    <Icon name="scan" className="h-4 w-4" />
                    Scan
                  </Link>
                  {p && (
                    <a
                      href={p.page_access === "private" ? `/${p.slug}?key=${p.private_access_key}` : `/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClass("ghost", "sm")}
                    >
                      Purchase page
                      <Icon name="external" className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <InstallApp appName={brand.name} />

      {backupCodesLeft === 0 && (
        <div className="mt-6">
          <Callout title="Make backup codes">
            If you lose your phone, you&apos;ll need a backup code to get back in.{" "}
            <Link href="/dashboard/security" className="font-medium underline">
              Make backup codes
            </Link>
          </Callout>
        </div>
      )}

      <form action={signOut} className="mt-8">
        <button className="text-sm text-ink-muted hover:text-ink hover:underline">Sign out</button>
      </form>
    </>
  );
}

function PaymentsBadge({ provider }: { provider: NonNullable<Membership["providers"]> }) {
  return provider.stripe_charges_enabled ? (
    <Badge tone="green">✓ Taking payments</Badge>
  ) : (
    <Badge tone="amber">Payments not set up</Badge>
  );
}

function PaymentsSetup({ provider, isOwner }: { provider: NonNullable<Membership["providers"]>; isOwner: boolean }) {
  const started = provider.stripe_account_id !== null;
  return (
    <div className="mt-3 rounded-lg bg-surface-muted px-3 py-2.5 text-sm">
      <p className="text-ink-muted">{started ? "Stripe setup isn't finished yet." : "Connect Stripe to get paid for packages."}</p>
      {isOwner ? (
        <form action={connectStripe} className="mt-2">
          <input type="hidden" name="providerId" value={provider.id} />
          <button className={buttonClass("primary", "sm")}>{started ? "Continue Stripe setup" : "Connect Stripe"}</button>
        </form>
      ) : (
        <p className="text-xs text-ink-muted">The business owner can connect Stripe.</p>
      )}
    </div>
  );
}
