"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, Notice } from "@/components/ui";
import { runPasskeyCeremony, useDeviceName, usePasskeySupport, wasCancelled } from "@/lib/passkey-browser";
import type { Passkey } from "@/lib/passkeys";
import { finishPasskeySetup, removePasskey, startPasskeySetup } from "./passkey-actions";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function PasskeysPanel({ passkeys }: { passkeys: Passkey[] }) {
  const router = useRouter();
  const supported = usePasskeySupport();
  const deviceName = useDeviceName();
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? deviceName; // suggested from the device until they type their own
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [removing, startRemoving] = useTransition();

  async function add() {
    setBusy(true);
    setError(null);
    setAdded(false);
    try {
      const start = await startPasskeySetup();
      if ("error" in start) return setError(start.error);
      const credential = await runPasskeyCeremony("create", start.publicKey);
      const done = await finishPasskeySetup(start.challengeId, credential, name);
      if (done.error) return setError(done.error);
      setAdded(true);
      router.refresh();
    } catch (e) {
      if (!wasCancelled(e)) setError("This device couldn't make a passkey. Try another device, or keep using your password and code.");
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    startRemoving(async () => {
      const res = await removePasskey(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-4">
      {passkeys.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line">
          {passkeys.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span>
                <span className="font-medium">{p.name}</span>
                <span className="block text-xs text-ink-muted">Added {fmt(p.createdAt)}</span>
              </span>
              <button type="button" onClick={() => remove(p.id)} disabled={removing} className="text-sm text-danger underline disabled:opacity-60">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {supported !== false ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="font-medium">Name for this device</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="mt-1 block w-56 rounded-md border border-line bg-surface px-3 py-2"
            />
          </label>
          <button type="button" onClick={add} disabled={busy} className={buttonClass("primary")}>
            {busy ? "Waiting for your device…" : "Add a passkey on this device"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">This browser can&apos;t make passkeys. Try a recent Chrome, Safari or Edge.</p>
      )}

      {added && <Notice tone="success">Passkey added. Next time, choose &quot;Sign in with a passkey&quot; on the sign-in page.</Notice>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
