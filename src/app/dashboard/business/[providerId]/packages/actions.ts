"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { packagePresets } from "@/config/package-presets";
import { requireManager } from "@/lib/auth";
import { MAX_DISCOUNT_PERCENT, PACKAGE_LIMITS, formatCents, parseDiscount, parseMoneyToCents, parsePackageForm, presetPriceCents } from "@/lib/packages";
import { createSessionClient } from "@/lib/supabase/server";

// All package changes are made AS the signed-in user, so row-level security also checks
// they are an owner/manager of this business with two-step verification.

export type PackageFormState = { error?: string };

const SAVE_FAILED = "Couldn't save. Please try again.";

function packagesPath(providerId: string) {
  return `/dashboard/business/${providerId}/packages`;
}

async function nextSortOrder(providerId: string): Promise<number> {
  const db = await createSessionClient();
  const { data } = await db
    .from("package_templates")
    .select("sort_order")
    .eq("provider_id", providerId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  return (data?.sort_order ?? 0) + 1;
}

export async function createPackage(providerId: string, _prev: PackageFormState, formData: FormData): Promise<PackageFormState> {
  await requireManager(providerId);
  const parsed = parsePackageForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const db = await createSessionClient();
  const { error } = await db
    .from("package_templates")
    .insert({ provider_id: providerId, ...parsed.value, sort_order: await nextSortOrder(providerId) });
  if (error) {
    console.error("create package failed:", error.code, error.message);
    return { error: SAVE_FAILED };
  }
  redirect(packagesPath(providerId));
}

export async function updatePackage(
  providerId: string,
  packageId: string,
  _prev: PackageFormState,
  formData: FormData,
): Promise<PackageFormState> {
  await requireManager(providerId);
  const parsed = parsePackageForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  // Past sales keep their own copy of name, visits and price, so editing never changes them.
  const db = await createSessionClient();
  const { data, error } = await db
    .from("package_templates")
    .update(parsed.value)
    .eq("id", packageId)
    .eq("provider_id", providerId)
    .select("id");
  if (error || !data?.length) {
    console.error("update package failed:", error?.code, error?.message ?? "no row");
    return { error: SAVE_FAILED };
  }
  redirect(packagesPath(providerId));
}

export async function setPackageActive(providerId: string, packageId: string, active: boolean): Promise<void> {
  await requireManager(providerId);
  const db = await createSessionClient();
  const { error } = await db
    .from("package_templates")
    .update({ active })
    .eq("id", packageId)
    .eq("provider_id", providerId);
  if (error) console.error("set package active failed:", error.code, error.message);
  refresh();
}

// Only for packages that have never sold. Sold ones are paused instead, to keep history tidy.
export async function deletePackage(providerId: string, packageId: string): Promise<void> {
  await requireManager(providerId);
  const db = await createSessionClient();
  const { count } = await db
    .from("purchases")
    .select("id", { count: "exact", head: true })
    .eq("package_template_id", packageId);
  if ((count ?? 1) > 0) {
    console.warn("refused to delete a package that has sales:", packageId);
  } else {
    const { error } = await db.from("package_templates").delete().eq("id", packageId).eq("provider_id", providerId);
    if (error) console.error("delete package failed:", error.code, error.message);
  }
  refresh();
}

export async function addPresetPackages(providerId: string, _prev: PackageFormState, formData: FormData): Promise<PackageFormState> {
  await requireManager(providerId);
  const perVisit = parseMoneyToCents(String(formData.get("perVisit") ?? ""));
  if (perVisit === null || perVisit < PACKAGE_LIMITS.priceMinCents) {
    return { error: `Enter your usual price for one visit (at least ${formatCents(PACKAGE_LIMITS.priceMinCents)}).` };
  }
  const chosen = new Set(formData.getAll("preset").map(String));
  const presets = packagePresets.filter((p) => chosen.has(p.id));
  if (presets.length === 0) return { error: "Tick at least one package to add." };

  // each package's % off, as edited on the form (the preset's own if left out)
  const discountOf = new Map<string, number>();
  for (const p of presets) {
    const raw = formData.get(`discount_${p.id}`);
    const pct = raw === null ? p.discountPercent : parseDiscount(String(raw));
    if (pct === null) return { error: `Enter a % off between 0 and ${MAX_DISCOUNT_PERCENT} for ${p.name}.` };
    discountOf.set(p.id, pct);
  }

  const rows = presets.map((p) => ({
    name: p.name,
    visits: p.visits,
    price_cents: presetPriceCents(perVisit, p.visits, discountOf.get(p.id)!),
    expires_days: p.expiresDays,
  }));
  if (rows.some((r) => r.price_cents > PACKAGE_LIMITS.priceMaxCents)) {
    return { error: `That makes a package over ${formatCents(PACKAGE_LIMITS.priceMaxCents)}. Check the price per visit.` };
  }

  let sortOrder = await nextSortOrder(providerId);
  const db = await createSessionClient();
  const { error } = await db
    .from("package_templates")
    .insert(rows.map((r) => ({ provider_id: providerId, ...r, sort_order: sortOrder++ })));
  if (error) {
    console.error("add preset packages failed:", error.code, error.message);
    return { error: SAVE_FAILED };
  }
  redirect(packagesPath(providerId));
}
