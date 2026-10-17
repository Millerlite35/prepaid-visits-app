"use client";

import { useActionState } from "react";
import { recoverWithBackupCode } from "../actions";

export function BackupCodeForm() {
  const [state, formAction, pending] = useActionState(recoverWithBackupCode, {});

  return (
    <form action={formAction} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium">Backup code</span>
        <input
          name="backupCode"
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="abcde-fghjk"
          maxLength={20}
          className="mt-1 block w-56 rounded-md border border-line bg-surface px-3 py-2 font-mono text-lg"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60">
        {pending ? "Checking…" : "Use backup code"}
      </button>
    </form>
  );
}
