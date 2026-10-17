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
          className="mt-1 block w-56 rounded-md border border-zinc-300 px-3 py-2 font-mono text-lg dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Checking…" : "Use backup code"}
      </button>
    </form>
  );
}
