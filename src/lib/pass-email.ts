import "server-only";
import { brand } from "@/config/brand";
import { logoUrl } from "@/lib/branding";
import { emailConfigured, escapeHtml, fromAddress, sendEmail } from "@/lib/email";
import { formatDate, passUrl, qrPng } from "@/lib/passes";
import { getAdminClient } from "@/lib/supabase/admin";

// Why the email is being sent:
//   "purchase": right after a paid checkout (sent once per purchase)
//   "resend":   staff resent it from the client's page
//   "reissue":  the old pass was cancelled and this is the replacement
export type PassEmailKind = "purchase" | "resend" | "reissue";

const INTRO: Record<PassEmailKind, string> = {
  purchase: "thanks for your purchase!",
  resend: "here's your pass again.",
  reissue: "here's your new pass. Your old pass no longer works.",
};

// Email the client their pass (QR code + link) and a summary of their latest purchase.
// Never throws for email problems (the purchase is already recorded); returns what happened.
export async function sendPassEmail(
  purchaseId: string,
  credentialId: string,
  kind: PassEmailKind = "purchase",
  actorId: string | null = null,
): Promise<"sent" | "skipped" | "failed"> {
  const db = getAdminClient();
  if (!emailConfigured()) {
    console.warn("pass email skipped: RESEND_API_KEY / EMAIL_FROM_ADDRESS not set");
    return "skipped";
  }

  try {
    const { data: p } = await db
      .from("purchases")
      .select(
        "provider_id, package_name, visits_purchased, expires_at, visit_account_id, visit_accounts(clients(full_name, email)), providers(display_name, brand_color, logo_path, pass_label, vocab_singular, vocab_plural)",
      )
      .eq("id", purchaseId)
      .single<{
        provider_id: string;
        package_name: string;
        visits_purchased: number;
        expires_at: string | null;
        visit_account_id: string;
        visit_accounts: { clients: { full_name: string; email: string } };
        providers: {
          display_name: string;
          brand_color: string;
          logo_path: string | null;
          pass_label: string;
          vocab_singular: string;
          vocab_plural: string;
        };
      }>();
    const { data: cred } = await db.from("credentials").select("token").eq("id", credentialId).single<{ token: string }>();
    if (!p || !cred) throw new Error("purchase or pass not found");
    const { data: bal } = await db
      .from("account_balances")
      .select("usable_visits")
      .eq("visit_account_id", p.visit_account_id)
      .maybeSingle<{ usable_visits: number }>();

    const prov = p.providers;
    const client = p.visit_accounts.clients;
    const firstName = client.full_name.split(" ")[0];
    const unit = p.visits_purchased === 1 ? prov.vocab_singular : prov.vocab_plural;
    const link = passUrl(cred.token);
    const expiry = p.expires_at ? `Expires ${formatDate(p.expires_at)}` : "Never expires";
    const available = bal?.usable_visits ?? p.visits_purchased;
    const e = escapeHtml;
    const logo = logoUrl(prov.logo_path);
    const logoHtml = logo
      ? `<img src="${e(logo)}" alt="${e(prov.display_name)} logo" height="56" style="display:block;max-height:56px;max-width:220px;height:auto;margin:0 0 12px">`
      : "";

    const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
    ${logoHtml}
    <p style="margin:0 0 4px;font-size:20px;font-weight:bold;color:${e(prov.brand_color)}">${e(prov.display_name)}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#52525b">${e(prov.pass_label)}</p>
    <p style="margin:0 0 12px">Hi ${e(firstName)}, ${e(INTRO[kind])}</p>
    <p style="margin:0 0 4px"><strong>${e(p.package_name)}</strong>: ${p.visits_purchased} ${e(unit)}</p>
    <p style="margin:0 0 4px;font-size:14px;color:#52525b">${e(expiry)}</p>
    <p style="margin:0 0 20px;font-size:14px">Available now: <strong>${available}</strong></p>
    <p style="margin:0 0 8px">Show this code at each ${e(prov.vocab_singular)} to check in:</p>
    <p style="text-align:center;margin:0 0 16px"><img src="cid:pass-qr" width="240" height="240" alt="Your check-in code" style="display:inline-block"></p>
    <p style="text-align:center;margin:0 0 24px">
      <a href="${e(link)}" style="display:inline-block;background:${e(prov.brand_color)};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Open your pass</a>
    </p>
    <p style="margin:0;font-size:12px;color:#71717a">Keep this email: it's your pass. Anyone with this code can use your ${e(prov.vocab_plural)}, so don't share it. Questions or refunds: contact ${e(prov.display_name)}.</p>
  </div>
  <p style="text-align:center;font-size:11px;color:#a1a1aa">Sent by ${e(brand.name)} for ${e(prov.display_name)}</p>
</body></html>`;

    const text = [
      `${prov.display_name}: ${prov.pass_label}`,
      "",
      `Hi ${firstName}, ${INTRO[kind]}`,
      `${p.package_name}: ${p.visits_purchased} ${unit}. ${expiry}.`,
      `Available now: ${available}`,
      "",
      `Open your pass and show its code at each ${prov.vocab_singular}: ${link}`,
      "",
      `Keep this email: it's your pass. Don't share it. Questions or refunds: contact ${prov.display_name}.`,
    ].join("\n");

    await sendEmail({
      to: client.email,
      from: fromAddress(prov.display_name),
      subject: `Your ${kind === "reissue" ? "new " : ""}${prov.pass_label} from ${prov.display_name}`,
      html,
      text,
      attachments: [{ filename: "pass-qr.png", content: await qrPng(cred.token), contentId: "pass-qr" }],
      // the purchase email is sent once ever; a resend at most once a minute; a reissue once per new pass
      idempotencyKey:
        kind === "purchase"
          ? `pass-email-${purchaseId}`
          : kind === "resend"
            ? `pass-resend-${credentialId}-${Math.floor(Date.now() / 60000)}`
            : `pass-reissue-${credentialId}`,
    });

    await db.from("audit_log").insert({
      provider_id: p.provider_id,
      actor_id: actorId,
      action: "pass.email_sent",
      entity: "purchase",
      entity_id: purchaseId,
      metadata: { kind },
    });
    return "sent";
  } catch (e) {
    console.error(`pass email (${kind}) for purchase ${purchaseId} failed:`, e instanceof Error ? e.message : e);
    await db.from("audit_log").insert({ actor_id: actorId, action: "pass.email_failed", entity: "purchase", entity_id: purchaseId, metadata: { kind } });
    return "failed";
  }
}
