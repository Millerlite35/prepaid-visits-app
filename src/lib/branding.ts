// Provider branding helpers that are safe to use anywhere (no secrets).

export const LOGO_BUCKET = "provider-logos";
export const LOGO_MAX_BYTES = 1024 * 1024; // 1 MB, same as the bucket's limit
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

// Public web address of a provider's logo, or null if they haven't uploaded one.
export function logoUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${LOGO_BUCKET}/${logoPath.split("/").map(encodeURIComponent).join("/")}`;
}
