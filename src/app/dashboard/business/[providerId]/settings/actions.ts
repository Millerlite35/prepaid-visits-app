"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { requireOwner } from "@/lib/auth";
import {
  PROFESSION_PRESETS,
  SETTINGS_LIMITS,
  US_TIMEZONES,
  cleanVocab,
  isHexColor,
  passLabelProblem,
} from "@/lib/page-settings";
import { checkSlug } from "@/lib/slug";
import { createSessionClient } from "@/lib/supabase/server";

// Business settings are owner-only. Changes are made AS the signed-in owner, so the
// database also checks ownership, two-step verification and which columns may change.

export type SettingsState = { error?: string; saved?: boolean };

const SAVE_FAILED = "Couldn't save. Please try again.";

async function saveProvider(providerId: string, changes: Record<string, unknown>): Promise<SettingsState> {
  const db = await createSessionClient();
  const { data, error } = await db.from("providers").update(changes).eq("id", providerId).select("id");
  if (error?.code === "23505") return { error: "That web address is already taken. Try another." };
  if (error || !data?.length) {
    console.error("save provider settings failed:", error?.code, error?.message ?? "no row");
    return { error: SAVE_FAILED };
  }
  refresh();
  return { saved: true };
}

export async function savePageDetails(providerId: string, _prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireOwner(providerId);
  const displayName = String(formData.get("displayName") ?? "").trim();
  const brandColor = String(formData.get("brandColor") ?? "");
  const singular = cleanVocab(String(formData.get("vocabSingular") ?? ""));
  const plural = cleanVocab(String(formData.get("vocabPlural") ?? ""));
  const passLabel = String(formData.get("passLabel") ?? "").trim();
  const profession = String(formData.get("profession") ?? "");
  const timezone = String(formData.get("timezone") ?? "");

  if (!displayName || displayName.length > SETTINGS_LIMITS.nameMax) {
    return { error: `Enter a business name (up to ${SETTINGS_LIMITS.nameMax} characters).` };
  }
  if (!isHexColor(brandColor)) return { error: "Pick a brand colour." };
  if (!singular || !plural) {
    return { error: "Wording must be a word or two, letters only (for example \"visit\" and \"visits\")." };
  }
  const labelProblem = passLabelProblem(passLabel);
  if (labelProblem) return { error: labelProblem };

  return saveProvider(providerId, {
    display_name: displayName,
    brand_color: brandColor.toUpperCase(),
    vocab_singular: singular,
    vocab_plural: plural,
    pass_label: passLabel,
    profession_template: PROFESSION_PRESETS.some((p) => p.id === profession) ? profession : null,
    ...(US_TIMEZONES.some((t) => t.value === timezone) ? { timezone } : {}),
  });
}

export async function saveAddressAndAccess(providerId: string, _prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireOwner(providerId);
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const access = String(formData.get("pageAccess") ?? "");
  const slugProblem = checkSlug(slug);
  if (slugProblem) return { error: slugProblem };
  if (access !== "public" && access !== "private") return { error: "Choose public or private." };
  return saveProvider(providerId, { slug, page_access: access });
}

// New secret for the private link. Anyone holding the old link loses access.
export async function newPrivateLink(providerId: string): Promise<void> {
  await requireOwner(providerId);
  const result = await saveProvider(providerId, { private_access_key: randomBytes(16).toString("hex") });
  if (result.error) console.error("new private link failed");
}

export async function saveTerms(providerId: string, _prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireOwner(providerId);
  const terms = String(formData.get("terms") ?? "").replace(/\r\n/g, "\n").trim();
  if (terms.length > SETTINGS_LIMITS.termsMax) {
    return { error: `Terms must be under ${SETTINGS_LIMITS.termsMax.toLocaleString()} characters.` };
  }
  // the database saves the old wording and bumps the version automatically
  return saveProvider(providerId, { terms_text: terms });
}
