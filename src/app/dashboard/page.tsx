import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { requireUser } from "@/lib/auth";
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
  role: string;
  providers: {
    id: string;
    display_name: string;
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
    .select("role, providers(id, display_name, stripe_account_id, stripe_charges_enabled)")
    .returns<Membership[]>();

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
              {data.map((m, i) => (
                <li key={m.providers?.id ?? i} className="py-3">
                  <span className="font-medium">{m.providers?.display_name ?? "A business"}</span>{" "}
                  <span className="text-zinc-500">({m.role.replace("_", " ")})</span>
                  {m.providers && (m.role === "owner" || m.role === "manager") && (
                    <Link href={`/dashboard/business/${m.providers.id}/packages`} className="ml-3 underline">
                      Packages
                    </Link>
                  )}
                  {m.providers && <PaymentsStatus provider={m.providers} isOwner={m.role === "owner"} />}
                </li>
              ))}
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
