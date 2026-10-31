import { brand, wordmarkParts } from "@/config/brand";

// Our wordmark and email frame for emails WE send (staff invites, security alerts, support).
// Text, not an image: shows even when the mail app blocks images, and follows brand.ts.
// Pass emails to clients lead with the practice's own branding instead (pass-email.ts).

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function emailWordmark(fontSize = 26): string {
  const [first, second] = wordmarkParts();
  return (
    `<span style="font-family:'Segoe UI',Figtree,Arial,Helvetica,sans-serif;font-size:${fontSize}px;letter-spacing:-0.02em;white-space:nowrap">` +
    `<span style="font-weight:600;color:${brand.colors.primary}">${esc(first)}</span>` +
    `<span style="font-weight:400;color:${brand.colors.accent}">${esc(second)}</span></span>`
  );
}

// A whole email: wordmark header, white card with the body, light grey page
export function brandedEmail(bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
  <div style="max-width:480px;margin:0 auto">
    <p style="margin:0 0 16px;padding:0 4px">${emailWordmark()}</p>
    <div style="background:#ffffff;border-radius:12px;padding:28px;line-height:1.5">${bodyHtml}</div>
  </div>
</body></html>`;
}
