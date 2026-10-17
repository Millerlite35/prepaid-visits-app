import "server-only";
import { Resend } from "resend";
import { brand } from "@/config/brand";
import { requireEnv } from "@/lib/env";

// Transactional email through Resend. Emails must never contain health details
// (CLAUDE.md): business name, package and visit counts only.

let resend: Resend | undefined;

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM_ADDRESS);
}

function getResend(): Resend {
  resend ??= new Resend(requireEnv("RESEND_API_KEY"));
  return resend;
}

// "Test Studio via Visit Pack <passes@example.com>" (names stripped of characters that
// would break the header)
export function fromAddress(senderName: string): string {
  const clean = (s: string) => s.replace(/["<>\r\n]/g, "").trim();
  return `"${clean(senderName)} via ${clean(brand.name)}" <${requireEnv("EMAIL_FROM_ADDRESS")}>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendEmail(args: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer; contentId?: string }[];
  idempotencyKey: string;
}): Promise<string> {
  const { idempotencyKey, ...email } = args;
  const { data, error } = await getResend().emails.send(email, { idempotencyKey });
  if (error) throw new Error(`email failed: ${error.name}: ${error.message}`);
  return data.id;
}
