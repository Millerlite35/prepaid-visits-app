"use client";

import { useState } from "react";
import { buttonClass, cx } from "@/components/ui";
import { runPasskeyCeremony, usePasskeySupport, wasCancelled } from "@/lib/passkey-browser";
import { finishPasskeyLogin, startPasskeyLogin } from "./passkey-actions";

// "Sign in with a passkey": the phone or computer offers the saved passkey, no email typed.
// Hidden where the browser can't do passkeys.
export function PasskeyLogin() {
  const supported = usePasskeySupport();
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!supported) return null;

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      const start = await startPasskeyLogin();
      if ("error" in start) return setError(start.error);
      const credential = await runPasskeyCeremony("request", start.publicKey);
      const res = await finishPasskeyLogin(start.challengeId, credential, remember); // redirects on success
      if (res?.error) setError(res.error);
    } catch (e) {
      if (!wasCancelled(e)) setError("No passkey for this site was found on this device. Sign in with your password instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <p className="mb-6 flex items-center gap-3 text-xs text-ink-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </p>
      <button type="button" onClick={signIn} disabled={busy} className={cx(buttonClass("secondary"), "w-full")}>
        {busy ? "Waiting for your device…" : "Sign in with a passkey"}
      </button>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line" />
        <span>
          Remember this device for 30 days
          <span className="block text-xs text-ink-muted">Leave unticked on a shared computer.</span>
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
