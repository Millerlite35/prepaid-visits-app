"use client";

import { useActionState } from "react";
import type { CodeState } from "./actions";

type Props = {
  action: (prev: CodeState, formData: FormData) => Promise<CodeState>;
  factorId?: string;
  submitLabel: string;
};

export function CodeForm({ action, factorId, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-3">
      {factorId && <input type="hidden" name="factorId" value={factorId} />}
      <label className="block">
        <span className="text-sm font-medium">6-digit code</span>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          className="mt-1 block w-40 rounded-md border border-line bg-surface px-3 py-2 text-lg tracking-widest"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Checking…" : submitLabel}
      </button>
    </form>
  );
}
