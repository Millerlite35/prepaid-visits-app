"use client";

import { useActionState, useState } from "react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { makeBackupCodes, type CodesState } from "./actions";

export function BackupCodesPanel({ unused, brandName }: { unused: number; brandName: string }) {
  const [state, formAction, pending] = useActionState<CodesState>(() => makeBackupCodes(), {});
  const [copied, setCopied] = useState(false);

  if (state.codes) {
    const text = `${brandName} backup codes (each works once)\n\n${state.codes.join("\n")}\n`;
    return (
      <div className="mt-4 space-y-4">
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <strong>Save these now.</strong> This is the only time they&apos;re shown. Print them, or keep them in
          a password manager. Not on the same phone as your authenticator app.
        </p>
        <ul className="grid grid-cols-2 gap-2 font-mono text-base">
          {state.codes.map((c) => (
            <li key={c} className="rounded bg-zinc-100 px-3 py-1.5 text-center dark:bg-zinc-800">
              {c}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}
            className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium dark:border-zinc-700"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
            download="backup-codes.txt"
            className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium dark:border-zinc-700"
          >
            Download .txt
          </a>
          <button type="button" onClick={() => window.print()} className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium dark:border-zinc-700">
            Print
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-4 space-y-3">
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {unused > 0 ? (
        <ConfirmSubmit
          label="Make new backup codes"
          question="Your current codes will stop working. Continue?"
          confirmLabel="Make new codes"
          pending={pending}
          pendingLabel="Making codes…"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        />
      ) : (
        <button disabled={pending} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {pending ? "Making codes…" : "Make backup codes"}
        </button>
      )}
    </form>
  );
}
