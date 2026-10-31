// Browser side of passkeys (see src/lib/passkeys.ts): turns the server's JSON options into
// what navigator.credentials needs, and the device's answer back into JSON for the server.
// No Supabase client here: only the standard WebAuthn browser API.

import { useSyncExternalStore } from "react";

export type PasskeyCeremony = "create" | "request";

export function browserSupportsPasskeys(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function" && !!navigator.credentials;
}

// Browser facts for components: null / "" while rendering on the server (unknown), real values in the browser
const noSubscribe = () => () => {};
export function usePasskeySupport(): boolean | null {
  return useSyncExternalStore(noSubscribe, browserSupportsPasskeys, () => null);
}
export function useDeviceName(): string {
  return useSyncExternalStore(noSubscribe, guessDeviceName, () => "");
}

function fromBase64url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return bytes.buffer;
}

function toBase64url(buffer: ArrayBuffer | null | undefined): string | undefined {
  if (!buffer) return undefined;
  let text = "";
  for (const b of new Uint8Array(buffer)) text += String.fromCharCode(b);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type JsonOptions = Record<string, unknown> & {
  challenge: string;
  user?: { id: string } & Record<string, unknown>;
  excludeCredentials?: ({ id: string } & Record<string, unknown>)[];
  allowCredentials?: ({ id: string } & Record<string, unknown>)[];
};

function withBuffers(options: JsonOptions) {
  const list = (items?: ({ id: string } & Record<string, unknown>)[]) => items?.map((c) => ({ ...c, id: fromBase64url(c.id) }));
  return {
    ...options,
    challenge: fromBase64url(options.challenge),
    ...(options.user ? { user: { ...options.user, id: fromBase64url(options.user.id) } } : {}),
    ...(options.excludeCredentials ? { excludeCredentials: list(options.excludeCredentials) } : {}),
    ...(options.allowCredentials ? { allowCredentials: list(options.allowCredentials) } : {}),
  };
}

// Runs Face ID / fingerprint / PIN and returns the device's answer as plain JSON
export async function runPasskeyCeremony(type: PasskeyCeremony, publicKey: Record<string, unknown>): Promise<unknown> {
  const options = withBuffers(publicKey as JsonOptions);
  const credential = (
    type === "create"
      ? await navigator.credentials.create({ publicKey: options as unknown as PublicKeyCredentialCreationOptions })
      : await navigator.credentials.get({ publicKey: options as unknown as PublicKeyCredentialRequestOptions })
  ) as PublicKeyCredential | null;
  if (!credential) throw new Error("No passkey was chosen.");

  // newer browsers do the conversion themselves
  if (typeof (credential as { toJSON?: () => unknown }).toJSON === "function") {
    return (credential as unknown as { toJSON: () => unknown }).toJSON();
  }
  const r = credential.response as AuthenticatorAttestationResponse & AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: credential.id,
    type: "public-key",
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response:
      type === "create"
        ? { attestationObject: toBase64url(r.attestationObject), clientDataJSON: toBase64url(r.clientDataJSON) }
        : {
            authenticatorData: toBase64url(r.authenticatorData),
            clientDataJSON: toBase64url(r.clientDataJSON),
            signature: toBase64url(r.signature),
            userHandle: toBase64url(r.userHandle),
          },
  };
}

// The person pressed Cancel or closed the Face ID prompt: not worth an error message
export function wasCancelled(e: unknown): boolean {
  return e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "AbortError");
}

// A sensible default name for a new passkey, from the device it's being made on
export function guessDeviceName(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  return "This device";
}
