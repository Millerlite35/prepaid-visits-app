import "server-only";
import { brand } from "@/config/brand";
import { emailConfigured, escapeHtml, fromAddress, sendEmail } from "@/lib/email";
import { requireEnv } from "@/lib/env";

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  scan_only: "Front desk (scan only)",
};

export const ROLE_HELP: Record<string, string> = {
  manager: "Clients, packages and check-ins. No refunds, payments or page settings.",
  scan_only: "Check-ins only.",
};

// The joining instructions, used in the email and in the copyable message for the owner.
export function inviteText(businessName: string, email: string, role: string): string {
  const site = requireEnv("SITE_URL");
  return [
    `You've been invited to help run ${businessName} on ${brand.name} as ${ROLE_LABELS[role] ?? role}.`,
    "",
    "To join:",
    `1. Create an account at ${site}/signup using this email: ${email}`,
    `   (Already have an account? Sign in at ${site}/login instead.)`,
    "2. Set up two-step verification when asked.",
    `3. On your dashboard, click "Join ${businessName}".`,
    "",
    "This invitation expires in 14 days.",
  ].join("\n");
}

// Best effort: Resend's test sender only delivers to the account owner's address, so the
// owner also gets the text to send themselves.
export async function sendInviteEmail(inviteId: string, businessName: string, email: string, role: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  const text = inviteText(businessName, email, role);
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#18181b;padding:24px">
<div style="max-width:480px;margin:0 auto;white-space:pre-wrap;line-height:1.5">${escapeHtml(text)}</div>
</body></html>`;
  try {
    await sendEmail({
      to: email,
      from: fromAddress(businessName),
      subject: `${businessName} invited you to ${brand.name}`,
      html,
      text,
      idempotencyKey: `staff-invite-${inviteId}`,
    });
    return true;
  } catch (e) {
    console.warn("staff invite email not sent:", e instanceof Error ? e.message : e);
    return false;
  }
}
