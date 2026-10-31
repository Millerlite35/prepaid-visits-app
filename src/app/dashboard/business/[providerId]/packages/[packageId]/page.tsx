import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
import { requireManager } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { updatePackage } from "../actions";
import { PackageForm, type PackageValues } from "../package-form";
import { Icon } from "@/components/icons";
import { PageSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: `Edit package · ${brand.name}` };

export default function EditPackagePage({ params }: PageProps<"/dashboard/business/[providerId]/packages/[packageId]">) {
  return (
    <main className="w-full max-w-xl flex-1 px-4 py-8 sm:px-8">
      <Suspense fallback={<PageSkeleton variant="form" />}>
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
      .select("vocab_singular, vocab_plural, usual_price_cents")
      .eq("id", providerId)
      .single<{ vocab_singular: string; vocab_plural: string; usual_price_cents: number | null }>(),
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
      <Link href={`/dashboard/business/${providerId}/packages`} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <Icon name="back" className="h-4 w-4" />
        Packages
      </Link>
      <h1 className="mb-2 mt-4 text-2xl font-semibold tracking-tight text-ink">Edit package</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Changes apply to future purchases. Clients who already bought this package keep what
        they paid for.
      </p>
      <PackageForm
        action={updatePackage.bind(null, providerId, packageId)}
        initial={packageRes.data}
        vocabSingular={providerRes.data.vocab_singular}
        vocabPlural={providerRes.data.vocab_plural}
        submitLabel="Save changes"
        usualPriceCents={providerRes.data.usual_price_cents}
      />
    </>
  );
}
