import "server-only";
import { createHash, randomInt } from "node:crypto";
import { brand } from "@/config/brand";
import { emailConfigured, escapeHtml, sendEmail } from "@/lib/email";
import { requireEnv } from "@/lib/env";
import { allow, LIMITS } from "@/lib/rate-limit";
import { getAdminClient } from "@/lib/supabase/admin";

// One-time backup codes for a lost authenticator phone.
// A code is 10 characters (about 50 bits of randomness) shown as "abcde-fghjk". Letters
// and digits that look alike (0/o, 1/l/i) are left out. Only SHA-256 hashes are stored.
// Using one removes the old authenticator, which (Supabase rule) signs the person out
// everywhere; they sign in again with their password and set up the new phone.

export const BACKUP_CODE_COUNT = 10;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function normalize(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hashCode(code: string): string {
  return createHash("sha256").update(normalize(code)).digest("hex");
}

// Does this look like a backup code (rather than a 6-digit authenticator code)?
export function looksLikeBackupCode(raw: string): boolean {
  return /^[a-z0-9]{10}$/.test(normalize(raw)) && !/^\d+$/.test(normalize(raw));
}

// Make a new set; the old codes stop working. Returns the codes to show ONCE.
export async function createBackupCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const c = Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    return `${c.slice(0, 5)}-${c.slice(5)}`;
  });
  const { error } = await getAdminClient().rpc("replace_backup_codes", {
    p_user_id: userId,
    p_hashes: codes.map(hashCode),
  });
  if (error) throw new Error(`replace_backup_codes failed: ${error.message}`);
  return codes;
}

export async function unusedBackupCodeCount(userId: string): Promise<number> {
  const { count } = await getAdminClient()
    .from("mfa_backup_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("used_at", null);
  return count ?? 0;
}

export type RedeemResult = "ok" | "wrong" | "too_many";

// Check a code and use it up. Does NOT remove the authenticator (see removeAuthenticator).
export async function redeemBackupCode(userId: string, raw: string): Promise<RedeemResult> {
  if (!(await allow("backup-code", userId, LIMITS.backupCodePerUser))) return "too_many";
  if (!looksLikeBackupCode(raw)) return "wrong";
  const { data, error } = await getAdminClient().rpc("use_backup_code", { p_user_id: userId, p_hash: hashCode(raw) });
  if (error) {
    console.error("use_backup_code failed:", error.message);
    return "wrong";
  }
  return data === true ? "ok" : "wrong";
}

// Remove all of the person's authenticators (this signs them out everywhere), then tell
// them by email, so they'd notice if it wasn't them.
export async function removeAuthenticator(userId: string, email: string, remaining: number): Promise<void> {
  const admin = getAdminClient().auth.admin.mfa;
  const { data, error } = await admin.listFactors({ userId });
  if (error) throw new Error(`list factors failed: ${error.message}`);
  for (const f of data.factors) {
    const { error: delError } = await admin.deleteFactor({ id: f.id, userId });
    if (delError) throw new Error(`delete factor failed: ${delError.message}`);
  }
  if (email && emailConfigured()) {
    try {
      await sendBackupCodeAlert(email, remaining);
    } catch (e) {
      console.error("backup code alert email failed:", e instanceof Error ? e.message : e);
    }
  }
}

async function sendBackupCodeAlert(email: string, remaining: number): Promise<void> {
  const site = requireEnv("SITE_URL");
  const left = `You have ${remaining} backup code${remaining === 1 ? "" : "s"} left.`;
  const text = [
    `A backup code was just used to sign in to your ${brand.name} account, and your old authenticator app was removed.`,
    "",
    "If this was you: sign in again and set up your new phone. Then make new backup codes under Security.",
    left,
    "",
    `If this wasn't you: reset your password now at ${site}/forgot-password and contact support.`,
  ].join("\n");
  const html = `<p>A backup code was just used to sign in to your ${escapeHtml(brand.name)} account, and your old authenticator app was removed.</p>
<p><strong>If this was you:</strong> sign in again and set up your new phone. Then make new backup codes under Security. ${escapeHtml(left)}</p>
<p><strong>If this wasn't you:</strong> <a href="${escapeHtml(site)}/forgot-password">reset your password now</a> and contact support.</p>`;
  await sendEmail({
    to: email,
    from: `"${brand.name.replace(/["<>\r\n]/g, "")}" <${requireEnv("EMAIL_FROM_ADDRESS")}>`,
    subject: `A backup code was used on your ${brand.name} account`,
    html,
    text,
    idempotencyKey: `backup-code-${email}-${Date.now()}`,
  });
}
