import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { requireUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { connectStripe } from "./stripe/actions";

export const metadata: Metadata = { title: `Dashboard · ${brand.name}` };

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold text-brand">Dashboard</h1>
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

  return (
    <>
      <p className="mt-1 text-sm text-zinc-500">Signed in as {user.email}</p>

      <section className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-medium">Your businesses</h2>
        {error ? (
          <p className="mt-2 text-sm text-red-600">Couldn&apos;t load your businesses. Try refreshing.</p>
        ) : data.length === 0 ? (
          <>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              You&apos;re not part of a business yet.
            </p>
            <Link
              href="/dashboard/new-business"
              className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              Create your business
            </Link>
          </>
        ) : (
          <>
            <ul className="mt-2 divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              {data.map((m) => {
                const p = m.providers;
                const base = `/dashboard/business/${m.provider_id}`;
                return (
                  <li key={m.provider_id} className="py-3">
                    <span className="font-medium">{p?.display_name ?? names.get(m.provider_id) ?? "A business"}</span>{" "}
                    <span className="text-zinc-500">({m.role.replace("_", " ")})</span>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <Link href={`${base}/scan`} className="font-medium underline">
                        Scan
                      </Link>
                      {p && (m.role === "owner" || m.role === "manager") && (
                        <Link href={`${base}/packages`} className="underline">
                          Packages
                        </Link>
                      )}
                      {p && m.role === "owner" && (
                        <Link href={`${base}/settings`} className="underline">
                          Page settings
                        </Link>
                      )}
                      {p && (
                        <a
                          href={p.page_access === "private" ? `/${p.slug}?key=${p.private_access_key}` : `/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          View purchase page ↗
                        </a>
                      )}
                    </div>
                    {p && <PaymentsStatus provider={p} isOwner={m.role === "owner"} />}
                  </li>
                );
              })}
            </ul>
            <Link href="/dashboard/new-business" className="mt-4 inline-block text-sm underline">
              Add another business
            </Link>
          </>
        )}
      </section>

      <form action={signOut} className="mt-8">
        <button className="text-sm underline">Sign out</button>
      </form>
    </>
  );
}

function PaymentsStatus({ provider, isOwner }: { provider: NonNullable<Membership["providers"]>; isOwner: boolean }) {
  if (provider.stripe_charges_enabled) {
    return <p className="mt-1 text-green-700 dark:text-green-500">✓ Ready to accept payments</p>;
  }
  const started = provider.stripe_account_id !== null;
  return (
    <div className="mt-1">
      <p className="text-zinc-600 dark:text-zinc-400">
        {started ? "Stripe setup isn't finished yet." : "Connect Stripe to get paid for packages."}
      </p>
      {isOwner ? (
        <form action={connectStripe} className="mt-2">
          <input type="hidden" name="providerId" value={provider.id} />
          <button className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white">
            {started ? "Continue Stripe setup" : "Connect Stripe"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-zinc-500">The business owner can connect Stripe.</p>
      )}
    </div>
  );
}
