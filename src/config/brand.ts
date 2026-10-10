// The product's name, tagline and colors. This is the ONLY place they are written.
// Pages, page titles, emails and passes must import from here, never hardcode them,
// so renaming the product is a one-file change. (The name is still a placeholder.)
//
// This is OUR brand, used on platform pages (sign-in, dashboard, emails "sent via ...").
// Each provider's own purchase page uses the provider's name and brand_color from the
// database instead.
export const brand = {
  name: "Visit Pack",
  tagline: "Prepaid visit packages",
  colors: {
    primary: "#1B4D3E",
    accent: "#E8B04A",
  },
} as const;
