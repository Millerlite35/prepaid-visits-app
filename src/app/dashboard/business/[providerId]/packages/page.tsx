import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { requireManager } from "@/lib/auth";
import { describeExpiry, formatCents } from "@/lib/packages";
import { createSessionClient } from "@/lib/supabase/server";
import { addPresetPackages, createPackage, deletePackage, setPackageActive } from "./actions";
import { PackageForm } from "./package-form";
import { QuickStart } from "./quick-start";

export const metadata: Metadata = { title: `Packages · ${brand.name}` };

export default function PackagesPage({ params }: PageProps<"/dashboard/business/[providerId]/packages">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <PackagesContent params={params} />
      </Suspense>
    </main>
  );
}

type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  visits: number;
  price_cents: number;
  expires_days: number | null;
  active: boolean;
};

type ProviderVocab = { display_name: string; vocab_singular: string; vocab_plural: string };

async function PackagesContent({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  await requireManager(providerId);

  // read as the signed-in user: row-level security limits this to their own business
  const db = await createSessionClient();
  const [providerRes, packagesRes, soldRes] = await Promise.all([
    db.from("providers").select("display_name, vocab_singular, vocab_plural").eq("id", providerId).single<ProviderVocab>(),
    db
      .from("package_templates")
      .select("id, name, description, visits, price_cents, expires_days, active")
      .eq("provider_id", providerId)
      .order("sort_order")
      .returns<PackageRow[]>(),
    db
      .from("purchases")
      .select("package_template_id")
      .eq("provider_id", providerId)
      .not("package_template_id", "is", null)
      .returns<{ package_template_id: string }[]>(),
  ]);
  if (providerRes.error || packagesRes.error || soldRes.error) {
    return <p className="text-sm text-red-600">Couldn&apos;t load packages. Try refreshing.</p>;
  }

  const provider = providerRes.data;
  const packages = packagesRes.data;
  const hasSales = new Set(soldRes.data.map((s) => s.package_template_id));
  const { vocab_singular: one, vocab_plural: many } = provider;

  return (
    <>
      <Link href="/dashboard" className="text-sm underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-brand">Packages</h1>
      <p className="mt-1 text-sm text-zinc-500">{provider.display_name}</p>

      <section className="mt-8">
        <h2 className="font-medium">Your packages</h2>
        {packages.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            No packages yet. Use Quick start below, or create your own.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {packages.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
                <div className={p.active ? "" : "opacity-60"}>
                  <p className="font-medium">
                    {p.name}
                    {!p.active && <span className="ml-2 text-xs font-normal text-zinc-500">(not for sale)</span>}
                  </p>
                  <p>
                    {p.visits} {p.visits === 1 ? one : many} · {formatCents(p.price_cents)}{" "}
                    <span className="text-zinc-500">
                      ({formatCents(Math.round(p.price_cents / p.visits))} per {one})
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">{describeExpiry(p.expires_days)}</p>
                  {p.description && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{p.description}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/dashboard/business/${providerId}/packages/${p.id}`} className="underline">
                    Edit
                  </Link>
                  <form action={setPackageActive.bind(null, providerId, p.id, !p.active)}>
                    <button className="underline">{p.active ? "Stop selling" : "Sell again"}</button>
                  </form>
                  {!hasSales.has(p.id) && (
                    <form action={deletePackage.bind(null, providerId, p.id)}>
                      <button className="text-red-600 underline">Delete</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-medium">Quick start</h2>
        <p className="mb-4 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Add ready-made packages priced from your usual rate, with a discount for buying more.
        </p>
        <QuickStart action={addPresetPackages.bind(null, providerId)} vocabSingular={one} vocabPlural={many} />
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-4 font-medium">Create your own package</h2>
        <PackageForm
          action={createPackage.bind(null, providerId)}
          vocabSingular={one}
          vocabPlural={many}
          submitLabel="Add package"
        />
      </section>
    </>
  );
}
