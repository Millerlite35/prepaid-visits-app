// The product's name, tagline and colors. This is the ONLY place they are written.
// Pages, page titles, emails and passes must import from here, never hardcode them,
// so renaming the product is a one-file change. (The name is still a placeholder.)
//
// This is OUR brand, used on platform pages (sign-in, dashboard, emails "sent via ...").
// Each provider's own purchase page uses the provider's name and brand_color from the
// database instead.
export const brand = {
  name: "VisitBundle",
  tagline: "Prepaid visit packages",
  colors: {
    primary: "#1E3A5F", // navy (from the logo, logos/visitbundle-logo.svg)
    accent: "#4FAE7A", // green
    accentOnDark: "#6FCF97", // lighter green for dark backgrounds
  },
} as const;

// The wordmark's two parts: first word bold navy, second word green ("Visit" + "Bundle").
// Splits on a space, or else on the last capital letter.
export function wordmarkParts(name: string = brand.name): [string, string] {
  const space = name.indexOf(" ");
  if (space > 0) return [name.slice(0, space), name.slice(space + 1)];
  const cap = name.search(/[A-Z][^A-Z]*$/);
  return cap > 0 ? [name.slice(0, cap), name.slice(cap)] : [name, ""];
}
