// Design styles shared by the flyer/sign generator and the card printer. Each style is a
// small set of colours, fonts and frame choices built around the provider's own brand
// colour, so every business still looks like itself.

export type DesignStyleId = "professional" | "warm" | "minimal" | "classic" | "bordered" | "modern";

export type DesignStyle = {
  label: string;
  note: string;
  pageBg: string;
  ink: string;
  muted: string;
  accent: (brand: string) => string; // headings, borders
  stripe: (brand: string) => string; // decorative band / stripe
  headingFont: string;
  bodyFont: string;
  frame: "band" | "stripe" | "line" | "rules" | "double" | "topbar";
  packageBoxes: boolean; // boxed package cards on the flyer, or plain lines
};

const SANS = "Arial, Helvetica, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const GOLD = "#B8913A";

export const DESIGN_STYLES: Record<DesignStyleId, DesignStyle> = {
  professional: {
    label: "Professional",
    note: "Clean white, your colour as accent",
    pageBg: "#ffffff",
    ink: "#18181b",
    muted: "#52525b",
    accent: (b) => b,
    stripe: (b) => b,
    headingFont: SANS,
    bodyFont: SANS,
    frame: "band",
    packageBoxes: true,
  },
  warm: {
    label: "Warm",
    note: "Cream and gold, friendly serif",
    pageBg: "#F7F1E6",
    ink: "#3b2f25",
    muted: "#6b5a4a",
    accent: (b) => b,
    stripe: () => GOLD,
    headingFont: SERIF,
    bodyFont: SANS,
    frame: "stripe",
    packageBoxes: true,
  },
  minimal: {
    label: "Minimal",
    note: "Simple type and a large QR code",
    pageBg: "#ffffff",
    ink: "#111111",
    muted: "#555555",
    accent: () => "#111111",
    stripe: (b) => b,
    headingFont: SANS,
    bodyFont: SANS,
    frame: "line",
    packageBoxes: false,
  },
  classic: {
    label: "Classic",
    note: "White with ruled lines, serif",
    pageBg: "#ffffff",
    ink: "#1f2937",
    muted: "#4b5563",
    accent: (b) => b,
    stripe: (b) => b,
    headingFont: SERIF,
    bodyFont: SERIF,
    frame: "rules",
    packageBoxes: false,
  },
  bordered: {
    label: "Bordered",
    note: "Framed with a double border",
    pageBg: "#ffffff",
    ink: "#1f2937",
    muted: "#4b5563",
    accent: (b) => b,
    stripe: (b) => b,
    headingFont: SERIF,
    bodyFont: SANS,
    frame: "double",
    packageBoxes: true,
  },
  modern: {
    label: "Modern",
    note: "Bold colour bar across the top",
    pageBg: "#ffffff",
    ink: "#111827",
    muted: "#4b5563",
    accent: (b) => b,
    stripe: (b) => b,
    headingFont: SANS,
    bodyFont: SANS,
    frame: "topbar",
    packageBoxes: true,
  },
};

export const DESIGN_STYLE_IDS = Object.keys(DESIGN_STYLES) as DesignStyleId[];

export function isDesignStyle(v: unknown): v is DesignStyleId {
  return typeof v === "string" && v in DESIGN_STYLES;
}

// Heading fonts the provider can pick (on top of the style). The fonts are free Google
// fonts, self-hosted by Next.js (src/lib/design-fonts.ts); "style" keeps the style's own.
export type DesignFontId = "style" | "modern" | "friendly" | "elegant" | "bookish" | "bold";

export const DESIGN_FONTS: Record<DesignFontId, { label: string; family: string | null }> = {
  style: { label: "Style's own", family: null },
  modern: { label: "Modern", family: "var(--font-montserrat), Arial, sans-serif" },
  friendly: { label: "Friendly", family: "var(--font-nunito), Arial, sans-serif" },
  elegant: { label: "Elegant", family: "var(--font-playfair), Georgia, serif" },
  bookish: { label: "Book serif", family: "var(--font-lora), Georgia, serif" },
  bold: { label: "Bold serif", family: "var(--font-merriweather), Georgia, serif" },
};

export const DESIGN_FONT_IDS = Object.keys(DESIGN_FONTS) as DesignFontId[];

export function isDesignFont(v: unknown): v is DesignFontId {
  return typeof v === "string" && v in DESIGN_FONTS;
}

export function resolveStyle(styleId: DesignStyleId, fontId: DesignFontId): DesignStyle {
  const s = DESIGN_STYLES[styleId];
  const family = DESIGN_FONTS[fontId].family;
  return family ? { ...s, headingFont: family } : s;
}
