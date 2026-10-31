import "server-only";
import { requireEnv } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";

// Passkeys (Face ID, fingerprint, device PIN) as the SECOND step of signing in, in place of
// the 6-digit authenticator code. Supabase stores them as "webauthn" two-step factors, so a
// passkey sign-in reaches aal2 exactly like a code does (migration 0004 is unchanged).
//
// Supabase's own helpers for this run in the browser, and this app never creates a browser
// Supabase client (cookies are httpOnly). So the server asks Supabase for the challenge,
// the browser only runs navigator.credentials (src/lib/passkey-browser.ts), and the server
// sends the answer back to Supabase and saves the upgraded session.
//
// A passkey belongs to one web address (the "relying party"): passkeys made on
// prepaid-visits-app.vercel.app won't work on app.visitbundle.com. Staff add a new one after
// a domain move; the authenticator app keeps working meanwhile.

// OFF until Supabase supports passkeys as a two-step factor. Nov 2026: the Management API answers
// "Enabling of MFA with WebAuthn not currently supported" (setting mfa_web_authn_enroll_enabled /
// _verify_enabled; scripts/enable-passkey-mfa.ps1). Supabase's separate "Passkeys (Beta)" sign-in only
// counts as aal1 (a first step, like a password), so it can't replace the code. When Supabase allows
// it: run the script, set this to true, test adding a passkey and signing in with it.
export const PASSKEYS_AVAILABLE = false;

export type PasskeyCeremony = "create" | "request";
export type PasskeyChallenge = { challengeId: string; type: PasskeyCeremony; publicKey: Record<string, unknown> };
export type Passkey = { id: string; name: string; createdAt: string };

function relyingParty() {
  const site = new URL(requireEnv("SITE_URL"));
  // sent in both spellings: Supabase's client library uses camelCase, its API docs snake_case
  return { rpId: site.hostname, rpOrigins: [site.origin], rp_id: site.hostname, rp_origins: [site.origin] };
}

// Calls Supabase Auth's two-step API as the signed-in person
async function authApi<T>(path: string, body: unknown): Promise<T> {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new PasskeyError("not_signed_in");
  const res = await fetch(`${requireEnv("NEXT_PUBLIC_SUPABASE_URL")}/auth/v1${path}`, {
    method: "POST",
    headers: {
      apikey: requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = String(json.error_code ?? json.code ?? res.status);
    console.warn("passkey auth api failed:", path.replace(/[0-9a-f-]{36}/, ":id"), code, json.msg ?? json.message ?? "");
    throw new PasskeyError(code);
  }
  return json as T;
}

export class PasskeyError extends Error {
  constructor(public code: string) {
    super(`passkey: ${code}`);
  }
}

// The person's finished passkeys, newest first
export async function listPasskeys(): Promise<Passkey[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.mfa.listFactors();
  return (data?.all ?? [])
    .filter((f) => f.factor_type === "webauthn" && f.status === "verified")
    .map((f) => ({ id: f.id, name: f.friendly_name || "Passkey", createdAt: f.created_at }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Step 1 of adding a passkey: an unfinished factor plus the options for navigator.credentials.create
export async function beginPasskeyEnrollment(name: string): Promise<{ factorId: string } & PasskeyChallenge> {
  const supabase = await createSessionClient();
  // clear half-finished attempts (cancelled Face ID prompts) so they don't pile up
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "webauthn" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  // Supabase needs each factor's name to be unique per person: "iPhone", "iPhone 2"...
  const taken = new Set((factors?.all ?? []).filter((f) => f.status === "verified").map((f) => f.friendly_name));
  let unique = name;
  for (let n = 2; taken.has(unique); n++) unique = `${name} ${n}`;
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "webauthn", friendlyName: unique });
  if (error || !data) {
    console.warn("passkey enroll failed:", error?.code, error?.message);
    throw new PasskeyError(error?.code ?? "enroll_failed");
  }
  return { factorId: data.id, ...(await challengePasskey(data.id)) };
}

// A challenge for one factor: "create" for a new passkey, "request" to sign in with one
export async function challengePasskey(factorId: string): Promise<PasskeyChallenge> {
  const res = await authApi<{ id: string; webauthn: { type: PasskeyCeremony; credential_options: { publicKey: Record<string, unknown> } } }>(
    `/factors/${factorId}/challenge`,
    { webauthn: relyingParty() },
  );
  return { challengeId: res.id, type: res.webauthn.type, publicKey: res.webauthn.credential_options.publicKey };
}

// The browser's answer goes back to Supabase. On success the session is upgraded to aal2
// and saved in the login cookie. Returns the new access token (for "remember this device").
export async function verifyPasskey(
  factorId: string,
  challengeId: string,
  type: PasskeyCeremony,
  credential: unknown,
): Promise<string> {
  const session = await authApi<{ access_token: string; refresh_token: string }>(`/factors/${factorId}/verify`, {
    challenge_id: challengeId,
    webauthn: { ...relyingParty(), type, credential_response: credential },
  });
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
  if (error) throw new PasskeyError(error.code ?? "session_failed");
  return session.access_token;
}

export async function removePasskey(factorId: string): Promise<void> {
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new PasskeyError(error.code ?? "unenroll_failed");
}

// What the person sees when something goes wrong
export function passkeyErrorMessage(e: unknown): string {
  const code = e instanceof PasskeyError ? e.code : "";
  if (code.includes("not_enabled") || code.includes("disabled")) return "Passkeys aren't switched on for this app yet.";
  if (code.includes("expired")) return "That took too long. Please try again.";
  if (code === "not_signed_in") return "Your sign-in ran out. Please sign in again.";
  return "That passkey didn't work. Please try again, or use your authenticator code.";
}

// Names are shown to the person only; keep them short and plain
export function cleanPasskeyName(raw: unknown): string {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  return name || "Passkey";
}
