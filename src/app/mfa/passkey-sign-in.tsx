"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui";
import { runPasskeyCeremony, usePasskeySupport, wasCancelled } from "@/lib/passkey-browser";
import { finishPasskeySignIn, startPasskeySignIn } from "./actions";

type Props = { passkeys: { id: string; name: string }[] };

// The quick way through two-step: Face ID / fingerprint on a device that has a passkey.
// The code form stays below it for devices without one.
export function PasskeySignIn({ passkeys }: Props) {
  const supported = usePasskeySupport();
  const [busy, setBusy] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supported || passkeys.length === 0) return null;

  async function use(factorId: string) {
    setBusy(factorId);
    setError(null);
    try {
      const start = await startPasskeySignIn(factorId);
      if ("error" in start) return setError(start.error);
      const credential = await runPasskeyCeremony("request", start.publicKey);
      // on success the server redirects to the dashboard
      const res = await finishPasskeySignIn(factorId, start.challengeId, credential, remember);
      if (res?.error) setError(res.error);
    } catch (e) {
      if (!wasCancelled(e)) setError("That passkey isn't on this device. Choose another, or enter your code below.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        {passkeys.map((p) => (
          <button key={p.id} type="button" onClick={() => use(p.id)} disabled={busy !== null} className={buttonClass("primary")}>
            {busy === p.id ? "Waiting for your device…" : passkeys.length === 1 ? "Use passkey" : `Use passkey: ${p.name}`}
          </button>
        ))}
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line" />
        <span>Remember this device for 30 days</span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <p className="pt-3 text-xs text-ink-muted">Or use the code from your authenticator app:</p>
    </div>
  );
}
