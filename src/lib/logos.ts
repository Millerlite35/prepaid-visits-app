import "server-only";
import { randomBytes } from "node:crypto";
import { LOGO_BUCKET, LOGO_MAX_BYTES } from "@/lib/branding";
import { getAdminClient } from "@/lib/supabase/admin";

// Uploads go through the server only (callers must check the user owns the provider).
// The file type is decided from the file's actual bytes, not its name or the browser's
// claim, so a renamed script or SVG can't sneak in.

type ImageKind = { ext: "png" | "jpg" | "webp"; contentType: string };

function detectImage(bytes: Uint8Array): ImageKind | null {
  const b = bytes;
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", contentType: "image/png" };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", contentType: "image/jpeg" };
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", contentType: "image/webp" };
  return null;
}

export function logoProblem(file: File | null): string | null {
  if (!file || file.size === 0) return "Choose an image file.";
  if (file.size > LOGO_MAX_BYTES) return "That image is over 1 MB. Try a smaller or compressed version.";
  return null;
}

// Saves the new logo and returns its storage path. Deletes the previous one afterwards.
export async function uploadLogo(providerId: string, file: File | null, previousPath: string | null): Promise<{ path: string } | { error: string }> {
  const problem = logoProblem(file);
  if (problem || !file) return { error: problem ?? "Choose an image file." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectImage(bytes);
  if (!kind) return { error: "Use a PNG, JPG or WebP image." };

  // a fresh name each time, so browsers and email apps never show an old cached logo
  const path = `${providerId}/${randomBytes(8).toString("hex")}.${kind.ext}`;
  const storage = getAdminClient().storage.from(LOGO_BUCKET);
  const { error } = await storage.upload(path, bytes, { contentType: kind.contentType, upsert: false, cacheControl: "31536000" });
  if (error) {
    console.error("logo upload failed:", error.message);
    return { error: "Couldn't upload the logo. Please try again." };
  }
  if (previousPath) await removeLogoFile(previousPath);
  return { path };
}

export async function removeLogoFile(path: string): Promise<void> {
  const { error } = await getAdminClient().storage.from(LOGO_BUCKET).remove([path]);
  if (error) console.warn("could not delete old logo:", error.message);
}
