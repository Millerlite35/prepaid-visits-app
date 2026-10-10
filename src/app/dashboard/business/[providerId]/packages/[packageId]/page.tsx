import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
import { requireManager } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { updatePackage } from "../actions";
import { PackageForm, type PackageValues } from "../package-form";

export const metadata: Metadata = { title: `Edit package · ${brand.name}` };

export default function EditPackagePage({ params }: PageProps<"/dashboard/business/[providerId]/packages/[packageId]">) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <EditPackageContent params={params} />
      </Suspense>
    </main>
  );
}

async function EditPackageContent({ params }: { params: Promise<{ providerId: string; packageId: string }> }) {
  const { providerId, packageId } = await params;
  await requireManager(providerId);

  const db = await createSessionClient();
  const [providerRes, packageRes] = await Promise.all([
    db
      .from("providers")
      .select("vocab_singular, vocab_plural")
      .eq("id", providerId)
      .single<{ vocab_singular: string; vocab_plural: string }>(),
    db
      .from("package_templates")
      .select("name, description, visits, price_cents, expires_days")
      .eq("id", packageId)
      .eq("provider_id", providerId)
      .maybeSingle<PackageValues>(),
  ]);
  if (!providerRes.data || !packageRes.data) notFound();

  return (
    <>
      <Link href={`/dashboard/business/${providerId}/packages`} className="text-sm underline">
        ← Packages
      </Link>
      <h1 className="mb-2 mt-4 text-2xl font-semibold text-brand">Edit package</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Changes apply to future purchases. Clients who already bought this package keep what
        they paid for.
      </p>
      <PackageForm
        action={updatePackage.bind(null, providerId, packageId)}
        initial={packageRes.data}
        vocabSingular={providerRes.data.vocab_singular}
        vocabPlural={providerRes.data.vocab_plural}
        submitLabel="Save changes"
      />
    </>
  );
}
