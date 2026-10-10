// Business page settings: rules shared by the browser forms (live checks) and the server.
// Must stay within the database checks on providers (brand_color is #RRGGBB, etc.).

// Starting points by profession: fills the wording and pass label, all editable.
export const PROFESSION_PRESETS = [
  { id: "clinic", label: "Clinic or practitioner (chiropractic, acupuncture, massage…)", singular: "visit", plural: "visits", passLabel: "Wellness visit card" },
  { id: "therapy", label: "Therapy or counseling", singular: "session", plural: "sessions", passLabel: "Session card" },
  { id: "studio", label: "Yoga, pilates or fitness classes", singular: "class", plural: "classes", passLabel: "Class pass" },
  { id: "coaching", label: "Personal training or coaching", singular: "session", plural: "sessions", passLabel: "Session card" },
  { id: "other", label: "Something else", singular: "appointment", plural: "appointments", passLabel: "Visit card" },
] as const;

export const BRAND_COLOR_SWATCHES = ["#1B4D3E", "#1E3A8A", "#5B21B6", "#9D174D", "#B45309", "#0F766E", "#334155"];

export const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
];

export const SETTINGS_LIMITS = { nameMax: 80, vocabMax: 20, passLabelMax: 40, termsMax: 8000 };

// Hard rule 8: pass labels can be seen by anyone who sees the client's phone, so they
// must not reveal a specialty or health condition. A keyword check, not a guarantee.
const NOT_NEUTRAL = [
  "acupunct", "addiction", "cancer", "chiro", "clinic", "counsel", "dental", "dentist", "derm",
  "diagnos", "doctor", "dr.", "fertility", "hiv", "hormone", "infusion", "injur", "massage",
  "medic", "mental", "ortho", "pain", "physio", "pregnan", "prenatal", "psych", "recovery",
  "rehab", "sober", "std", "therap", "treatment", "weight",
];

export function passLabelProblem(label: string): string | null {
  const l = label.trim().toLowerCase();
  if (!l) return "Enter a label for the client's pass.";
  if (l.length > SETTINGS_LIMITS.passLabelMax) return `Keep it under ${SETTINGS_LIMITS.passLabelMax} characters.`;
  const hit = NOT_NEUTRAL.find((w) => l.includes(w));
  if (hit) {
    return "Keep pass labels neutral, with no specialty or health wording, because others may see them on a client's phone. Try \"Visit card\", \"Session card\" or \"Class pass\".";
  }
  return null;
}

// "Visit", " Classes " -> "visit", "classes". Letters, spaces and dashes only.
export function cleanVocab(word: string): string | null {
  const w = word.trim().toLowerCase().replace(/\s+/g, " ");
  return /^[a-z][a-z -]{0,19}$/.test(w) ? w : null;
}

export function isHexColor(c: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(c);
}

// Contrast of white text on this colour (WCAG). Under 4.5 is hard to read.
export function contrastWithWhite(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return 1.05 / (luminance + 0.05);
}

// A plain-language starting point. NOT legal advice: the provider (and the attorney)
// must review it. Covers the points the business plan lists for package terms.
export function starterTerms(businessName: string, singular: string, plural: string): string {
  return `${businessName}: prepaid package terms

1. What you're buying. A package is a prepaid number of ${plural} with ${businessName}. Each ${singular} you attend uses one from your balance.

2. Expiration. If your package has an expiration date, it is shown before you pay and on your pass. Unused ${plural} can't be used after that date, except where the law requires otherwise.

3. Refunds. You can get a full refund within 30 days of purchase if you haven't used any ${plural}. After that, or once you've used some, unused ${plural} can be refunded at the package's price per ${singular}, at ${businessName}'s discretion unless the law requires otherwise.

4. If ${businessName} stops offering ${plural}. If ${businessName} closes or stops offering ${plural}, your unused ${plural} will be refunded.

5. Transfers. A package belongs to the person who bought it and can't be transferred to someone else unless ${businessName} agrees.

6. Scheduling. Buying a package doesn't book an appointment. Book with ${businessName} as usual.

7. Questions. Contact ${businessName} directly about your package or a refund.`;
}
