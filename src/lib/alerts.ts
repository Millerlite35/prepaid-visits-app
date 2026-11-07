import "server-only";
import { createHash } from "node:crypto";
import { brand } from "@/config/brand";
import { emailConfigured, escapeHtml, sendEmail } from "@/lib/email";
import { brandedEmail } from "@/lib/email-layout";
import { allow } from "@/lib/rate-limit";

// "Something broke" emails to the founder (ALERT_EMAIL, else SUPPORT_EMAIL).
// - Never include client names, emails or pass codes: only what failed, where, and ids.
// - Throttled: the same problem emails at most once per 15 minutes, and at most 20 alerts
//   an hour in total, so a crash loop can't flood the inbox.
// - Never throws: an alert that fails to send only logs.
// Callers: src/instrumentation.ts (every server crash), the Stripe webhook, refunds, disputes.

const SAME_PROBLEM = { limit: 1, windowSeconds: 15 * 60 };
const ALL_ALERTS = { limit: 20, windowSeconds: 60 * 60 };

function recipient(): string | undefined {
  return process.env.ALERT_EMAIL || process.env.SUPPORT_EMAIL || undefined;
}

// Long or odd values (a pass code in a path, a key in a link) are cut down before sending
function clean(text: string, max = 500): string {
  return text
    .replace(/[?&]key=[^&\s]+/g, "?key=…")
    .replace(/\/pass\/[A-Za-z0-9]+/g, "/pass/…")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .slice(0, max);
}

export async function alertFounder(title: string, details: Record<string, string | number | undefined>): Promise<void> {
  const to = recipient();
  console.error(`ALERT: ${title}`, details);
  if (!to || !emailConfigured()) return;
  try {
    const fingerprint = createHash("sha256").update(title).digest("hex").slice(0, 16);
    if (!(await allow("alert", fingerprint, SAME_PROBLEM))) return;
    if (!(await allow("alert-all", "all", ALL_ALERTS))) return;

    const lines = Object.entries(details)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, clean(String(v))] as const);
    const when = new Date().toISOString();
    const text = [`${title}`, "", ...lines.map(([k, v]) => `${k}: ${v}`), `time: ${when}`, "", "Logs: Vercel > prepaid-visits-app > Logs"].join("\n");
    const html = brandedEmail(
      `<p style="margin:0 0 12px"><strong>${escapeHtml(title)}</strong></p>` +
        `<table style="font-size:14px">${lines
          .map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;color:#5b6676">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
          .join("")}<tr><td style="padding:2px 12px 2px 0;color:#5b6676">time</td><td>${when}</td></tr></table>` +
        `<p style="margin:12px 0 0;color:#5b6676">Logs: Vercel &gt; prepaid-visits-app &gt; Logs</p>`,
    );
    await sendEmail({
      to,
      from: `"${brand.name.replace(/["<>\r\n]/g, "")} alerts" <${process.env.EMAIL_FROM_ADDRESS}>`,
      subject: `[${brand.name}] ${clean(title, 120)}`,
      html,
      text,
      idempotencyKey: `alert-${fingerprint}-${Math.floor(Date.now() / SAME_PROBLEM.windowSeconds / 1000)}`,
    });
  } catch (e) {
    console.error("alert email failed:", e instanceof Error ? e.message : e);
  }
}
