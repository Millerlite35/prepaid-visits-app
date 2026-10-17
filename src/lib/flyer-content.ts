// What goes on a flyer, sign, table tent or social post. Plain functions (no server or
// browser APIs) so the live preview and the social image render exactly the same words.

export type FlyerPackage = { id: string; name: string; visits: number; priceCents: number };

export type FlyerContent = {
  businessName: string;
  color: string;
  logo: string | null;
  qrDataUrl: string;
  shortUrl: string; // shown under the QR code, without any private key
  singular: string;
  plural: string;
  headline: string;
  message: string;
  packages: FlyerPackage[];
  usualPriceCents: number | null; // optional "usual price per visit", for a savings line
};

export const MAX_FLYER_PACKAGES = 3;

export function defaultHeadline(plural: string): string {
  return `Prepay and save on your ${plural}`;
}

export function defaultMessage(plural: string): string {
  return `Buy a package online in a minute. Your pass arrives by email, and we scan it at each of your ${plural}.`;
}

function dollars(cents: number): string {
  const whole = cents % 100 === 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function packageLines(p: FlyerPackage, singular: string, plural: string, usualPriceCents: number | null) {
  const perVisit = Math.round(p.priceCents / p.visits);
  const saving =
    usualPriceCents && usualPriceCents > perVisit ? Math.round((1 - perVisit / usualPriceCents) * 100) : 0;
  return {
    title: p.name,
    detail: `${p.visits} ${p.visits === 1 ? singular : plural} for ${dollars(p.priceCents)}`,
    perVisit: p.visits > 1 ? `${dollars(perVisit)} per ${singular}` : null,
    saving: saving >= 1 ? `Save ${saving}%` : null,
  };
}

// Text fields come from the provider; keep them short so they fit the templates.
export const FLYER_LIMITS = { headline: 70, message: 180 };
