"use server";

import { refresh } from "next/cache";
import { brand } from "@/config/brand";
import { supportTopics } from "@/config/help-faq";
import { requireUser } from "@/lib/auth";
import { emailConfigured, escapeHtml, fromAddress, sendEmail } from "@/lib/email";
import { getAdminClient } from "@/lib/supabase/admin";

export type SupportState = { error?: string; message?: string };

const MAX_PER_HOUR = 5;

// "Contact support": save the message, then email it to the support inbox with the
// sender as reply-to, so a support reply is just hitting Reply.
export async function sendSupportRequest(_prev: SupportState, formData: FormData): Promise<SupportState> {
  const user = await requireUser();
  const topic = String(formData.get("topic") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const providerId = String(formData.get("providerId") ?? "");
  const page = String(formData.get("page") ?? "").slice(0, 300);

  if (!supportTopics.some((t) => t.value === topic)) return { error: "Choose what it's about." };
  if (!message) return { error: "Write a short message." };
  if (message.length > 3000) return { error: "Please keep it under 3,000 characters." };

  const db = getAdminClient();
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= MAX_PER_HOUR) return { error: "You've sent several messages this hour. We'll get back to you soon." };

  // only attach a business the person actually belongs to
  let business: { id: string; display_name: string } | null = null;
  if (providerId) {
    const { data: member } = await db
      .from("provider_members")
      .select("providers(id, display_name)")
      .eq("provider_id", providerId)
      .eq("user_id", user.id)
      .maybeSingle<{ providers: { id: string; display_name: string } }>();
    business = member?.providers ?? null;
  }

  const { data: saved, error } = await db
    .from("support_requests")
    .insert({ user_id: user.id, email: user.email, provider_id: business?.id ?? null, topic, message, page: page || null })
    .select("id")
    .single<{ id: string }>();
  if (error) {
    console.error("save support request failed:", error.code, error.message);
    return { error: "Couldn't send your message. Please try again." };
  }

  const inbox = process.env.SUPPORT_EMAIL;
  if (inbox && emailConfigured()) {
    const topicLabel = supportTopics.find((t) => t.value === topic)?.label ?? topic;
    const text = [
      `From: ${user.email}`,
      `Business: ${business?.display_name ?? "(not chosen)"}`,
      `Topic: ${topicLabel}`,
      `Page: ${page || "(unknown)"}`,
      `Request: ${saved.id}`,
      "",
      message,
    ].join("\n");
    try {
      await sendEmail({
        to: inbox,
        from: fromAddress("Support"),
        replyTo: user.email,
        subject: `[${brand.name} support] ${topicLabel} · ${business?.display_name ?? user.email}`,
        html: `<pre style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
        text,
        idempotencyKey: `support-${saved.id}`,
      });
      await db.from("support_requests").update({ emailed: true }).eq("id", saved.id);
    } catch (e) {
      // the message is saved either way; it just didn't email
      console.error("support email failed:", e instanceof Error ? e.message : e);
    }
  } else {
    console.warn("support request saved but not emailed: SUPPORT_EMAIL or email settings missing");
  }

  refresh();
  return { message: `Thanks, we've got your message. We'll reply to ${user.email}.` };
}
