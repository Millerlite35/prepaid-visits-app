import "server-only";
import { brand } from "@/config/brand";
import { emailConfigured, escapeHtml, sendEmail } from "@/lib/email";
import { brandedEmail } from "@/lib/email-layout";
import { requireEnv } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";

// Passkeys (Face ID, fingerprint, device PIN) through Supabase's "Passkeys (Beta)" sign-in.
// Plan and security reasoning: docs/passkey-signin-plan.md.
//
// STAGE 1 (now): a passkey replaces the password. Supabase labels that session aal1, so the
// person still enters the 6-digit code afterwards: nothing is weaker than password + code.
// After each passkey sign-in we log the token's aal/amr, to build stage 2 on facts.
// STAGE 2 (not built): count a user-verified passkey as two-step (migration + requireUser).
//
// Supabase's helpers for this run in the browser, and this app never creates a browser
// Supabase client (cookies are httpOnly). So the server calls Supabase's passkey API and saves
// the session; the browser only runs navigator.credentials (src/lib/passkey-browser.ts).
//
// The relying party (the web address a passkey belongs to) is set in the Supabase dashboard
// (Passkeys page), currently prepaid-visits-app.vercel.app. Passkeys don't work on other
// addresses (including localhost) and don't carry over to a new domain.

export type Passkey = { id: string; name: string; createdAt: string; lastUsedAt: string | null };
export type PasskeyOptions = { challengeId: string; publicKey: Record<string, unknown> };

export class PasskeyError extends Error {
  constructor(public code: string) {
    super(`passkey: ${code}`);
  }
}

// Calls Supabase Auth's passkey API, as the signed-in person when `asUser` is set
async function authApi<T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown, asUser = true): Promise<T> {
  const headers: Record<string, string> = {
    apikey: requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    "Content-Type": "application/json",
  };
  if (asUser) {
    const supabase = await createSessionClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new PasskeyError("not_signed_in");
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${requireEnv("NEXT_PUBLIC_SUPABASE_URL")}/auth/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = String(json.error_code ?? json.code ?? res.status);
    console.warn("passkey api failed:", method, path.replace(/[0-9a-f-]{36}/, ":id"), code, json.msg ?? json.message ?? "");
    throw new PasskeyError(code);
  }
  return json as T;
}

// Whether passkeys are switched on in Supabase (dashboard > Passkeys), so the sign-in page
// can hide the button when they're off
export async function passkeysEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${requireEnv("NEXT_PUBLIC_SUPABASE_URL")}/auth/v1/settings`, {
      headers: { apikey: requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") },
    });
    return res.ok && (await res.json()).passkeys_enabled === true;
  } catch {
    return false;
  }
}

type ListItem = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };

export async function listPasskeys(): Promise<Passkey[]> {
  const items = await authApi<ListItem[]>("GET", "/passkeys");
  return (Array.isArray(items) ? items : [])
    .map((p) => ({ id: p.id, name: p.friendly_name || "Passkey", createdAt: p.created_at, lastUsedAt: p.last_used_at ?? null }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Adding a passkey (signed-in person): options for navigator.credentials.create ...
export async function registrationOptions(): Promise<PasskeyOptions> {
  const res = await authApi<{ challenge_id: string; options: Record<string, unknown> }>("POST", "/passkeys/registration/options", {});
  return { challengeId: res.challenge_id, publicKey: res.options };
}

// ... then the device's answer, and a name for the list
export async function finishRegistration(challengeId: string, credential: unknown, name: string): Promise<void> {
  const created = await authApi<{ id: string }>("POST", "/passkeys/registration/verify", { challenge_id: challengeId, credential });
  if (created?.id) {
    await authApi("PATCH", `/passkeys/${created.id}`, { friendly_name: name }).catch(() => {}); // name is a nicety
  }
}

export async function deletePasskey(passkeyId: string): Promise<void> {
  await authApi("DELETE", `/passkeys/${passkeyId}`);
}

// Signing in (nobody signed in yet): options for navigator.credentials.get ...
export async function authenticationOptions(): Promise<PasskeyOptions> {
  const res = await authApi<{ challenge_id: string; options: Record<string, unknown> }>(
    "POST",
    "/passkeys/authentication/options",
    {},
    false,
  );
  return { challengeId: res.challenge_id, publicKey: res.options };
}

// ... then the device's answer. Saves the session in the login cookie.
export async function finishAuthentication(challengeId: string, credential: unknown): Promise<void> {
  const res = await authApi<{ access_token?: string; refresh_token?: string; session?: { access_token: string; refresh_token: string } }>(
    "POST",
    "/passkeys/authentication/verify",
    { challenge_id: challengeId, credential },
    false,
  );
  const tokens = res.session ?? res;
  if (!tokens.access_token || !tokens.refresh_token) throw new PasskeyError("no_session");
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
  if (error) throw new PasskeyError(error.code ?? "session_failed");

  // stage 1 measurement: what the database will see (method names only, no personal data)
  const { data: claims } = await supabase.auth.getClaims(tokens.access_token);
  const amr = Array.isArray(claims?.claims?.amr) ? claims.claims.amr.map((e: { method?: string }) => e?.method) : [];
  console.info("passkey sign-in token:", JSON.stringify({ aal: claims?.claims?.aal, amr, user: data.user ? "ok" : "none" }));
}

// What the person sees when something goes wrong
export function passkeyErrorMessage(e: unknown): string {
  const code = e instanceof PasskeyError ? e.code : "";
  if (code.includes("disabled") || code.includes("not_enabled")) return "Passkeys aren't switched on for this app yet.";
  if (code.includes("expired")) return "That took too long. Please try again.";
  if (code === "not_signed_in") return "Your sign-in ran out. Please sign in again.";
  return "That passkey didn't work. Please try again, or sign in with your password.";
}

// Names are shown to the person only; keep them short and plain
export function cleanPasskeyName(raw: unknown): string {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  return name || "Passkey";
}

// A passkey was added or removed: tell the person, so they'd notice if it wasn't them
export async function sendPasskeyAlert(email: string, change: "added" | "removed", name: string): Promise<void> {
  if (!email || !emailConfigured()) return;
  const site = requireEnv("SITE_URL");
  const what = change === "added" ? `A passkey ("${name}") was added to` : `A passkey ("${name}") was removed from`;
  const text = [
    `${what} your ${brand.name} account.`,
    "",
    "If this was you, there's nothing to do.",
    `If this wasn't you: reset your password now at ${site}/forgot-password, remove unknown passkeys under Security, and contact support.`,
  ].join("\n");
  const html = brandedEmail(`<p style="margin:0 0 12px">${escapeHtml(what)} your ${escapeHtml(brand.name)} account.</p>
<p style="margin:0 0 12px">If this was you, there's nothing to do.</p>
<p style="margin:0"><strong>If this wasn't you:</strong> <a href="${escapeHtml(site)}/forgot-password">reset your password now</a>, remove unknown passkeys under Security, and contact support.</p>`);
  try {
    await sendEmail({
      to: email,
      from: `"${brand.name.replace(/["<>\r\n]/g, "")}" <${requireEnv("EMAIL_FROM_ADDRESS")}>`,
      subject: `Passkey ${change} on your ${brand.name} account`,
      html,
      text,
      idempotencyKey: `passkey-${change}-${email}-${Date.now()}`,
    });
  } catch (e) {
    console.error("passkey alert email failed:", e instanceof Error ? e.message : e);
  }
}
