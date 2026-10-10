// Package rules shared by the browser forms (live preview) and the server (final check).
// Must stay within the database checks on package_templates (visits > 0, price >= 0).

export const PACKAGE_LIMITS = {
  nameMax: 60,
  descriptionMax: 300,
  visitsMax: 100,
  priceMinCents: 100, // $1, comfortably above Stripe's minimum charge
  priceMaxCents: 1_000_000, // $10,000
  expiresDaysMax: 3650, // 10 years
};

// Expiry choices in the form. "custom" reveals a number-of-days box.
export const EXPIRY_CHOICES = [
  { value: "none", label: "Never expires" },
  { value: "90", label: "3 months after purchase" },
  { value: "180", label: "6 months after purchase" },
  { value: "365", label: "1 year after purchase" },
  { value: "730", label: "2 years after purchase" },
  { value: "custom", label: "Custom number of days" },
] as const;

export type PackageInput = {
  name: string;
  description: string | null;
  visits: number;
  price_cents: number;
  expires_days: number | null;
};

// "$1,240.50" -> 124050. Returns null if it isn't a plain dollar amount.
export function parseMoneyToCents(raw: string): number | null {
  const s = raw.replace(/[$,\s]/g, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const [dollars, cents = ""] = s.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

// 24000 -> "$240", 4050 -> "$40.50"
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

export function describeExpiry(days: number | null): string {
  if (days === null) return "Never expires";
  const named: Record<number, string> = { 90: "3 months", 180: "6 months", 365: "1 year", 730: "2 years" };
  return `Expires ${named[days] ?? `${days} days`} after purchase`;
}

// The form's expiry select value for a stored number of days.
export function expiryChoiceFor(days: number | null): string {
  if (days === null) return "none";
  return EXPIRY_CHOICES.some((c) => c.value === String(days)) ? String(days) : "custom";
}

// Preset price: usual per-visit price x visits, minus the discount, rounded to whole dollars.
export function presetPriceCents(perVisitCents: number, visits: number, discountPercent: number): number {
  return Math.round((perVisitCents * visits * (100 - discountPercent)) / 100 / 100) * 100;
}

function parseExpiry(choice: string, customDays: string): { days: number | null } | { error: string } {
  if (choice === "none") return { days: null };
  const raw = choice === "custom" ? customDays.trim() : choice;
  const days = /^\d{1,4}$/.test(raw) ? Number(raw) : NaN;
  if (!(days >= 1 && days <= PACKAGE_LIMITS.expiresDaysMax)) {
    return { error: `Expiry must be between 1 and ${PACKAGE_LIMITS.expiresDaysMax} days.` };
  }
  return { days };
}

// Reads and checks the package form. Returns the clean values or a plain-language error.
export function parsePackageForm(formData: FormData): { value: PackageInput } | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visitsRaw = String(formData.get("visits") ?? "").trim();
  const priceCents = parseMoneyToCents(String(formData.get("price") ?? ""));
  const expiry = parseExpiry(String(formData.get("expiry") ?? "none"), String(formData.get("expiresCustomDays") ?? ""));

  if (!name || name.length > PACKAGE_LIMITS.nameMax) {
    return { error: `Give the package a name (up to ${PACKAGE_LIMITS.nameMax} characters).` };
  }
  if (description.length > PACKAGE_LIMITS.descriptionMax) {
    return { error: `Keep the description under ${PACKAGE_LIMITS.descriptionMax} characters.` };
  }
  const visits = /^\d{1,3}$/.test(visitsRaw) ? Number(visitsRaw) : NaN;
  if (!(visits >= 1 && visits <= PACKAGE_LIMITS.visitsMax)) {
    return { error: `Number of visits must be between 1 and ${PACKAGE_LIMITS.visitsMax}.` };
  }
  if (priceCents === null || priceCents < PACKAGE_LIMITS.priceMinCents || priceCents > PACKAGE_LIMITS.priceMaxCents) {
    return {
      error: `Enter a price between ${formatCents(PACKAGE_LIMITS.priceMinCents)} and ${formatCents(PACKAGE_LIMITS.priceMaxCents)}.`,
    };
  }
  if ("error" in expiry) return { error: expiry.error };

  return {
    value: { name, description: description || null, visits, price_cents: priceCents, expires_days: expiry.days },
  };
}
