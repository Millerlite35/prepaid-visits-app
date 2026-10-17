// Web addresses for provider pages: e.g. example.com/northshore-chiro
// Used in the browser (live preview) and on the server (final check).

// Must match the check constraint on providers.slug in the database.
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

// Provider pages live at /{slug}, so a business must never be able to claim one of
// the app's own pages. ADD EVERY NEW TOP-LEVEL ROUTE HERE.
const RESERVED = new Set([
  // routes that exist now
  "app-icon", "apple-icon", "auth", "dashboard", "forgot-password", "icon", "kiosk", "login", "mfa", "pass", "reset-password", "signup",
  // routes we are likely to need
  "about", "account", "admin", "api", "app", "billing", "card", "cards", "check-in", "checkin", "checkout",
  "contact", "help", "logout", "new", "passes", "pay", "pricing", "privacy",
  "scan", "scanner", "settings", "status", "support", "terms", "wallet", "www",
]);

// "Northshore Chiropractic & Wellness" -> "northshore-chiropractic-and-wellness"
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

// Returns a plain-language problem, or null if the web address is fine.
export function checkSlug(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) {
    return "Use 3–40 lowercase letters, numbers or dashes, starting and ending with a letter or number.";
  }
  if (RESERVED.has(slug)) return "That web address is reserved. Try another.";
  return null;
}
