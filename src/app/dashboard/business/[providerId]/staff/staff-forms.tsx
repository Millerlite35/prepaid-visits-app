"use client";

import { useActionState, useState } from "react";
import type { InviteState } from "./actions";

const inputClass = "mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2";

export function InviteForm({
  action,
  roleHelp,
}: {
  action: (prev: InviteState, formData: FormData) => Promise<InviteState>;
  roleHelp: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [role, setRole] = useState("scan_only");
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <label className="block text-sm">
          <span className="font-medium">Their email</span>
          <input name="email" type="email" required maxLength={254} autoComplete="off" className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Role</span>
          <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
            <option value="scan_only">Front desk (scan only)</option>
            <option value="manager">Manager</option>
          </select>
          <span className="mt-1 block text-xs text-ink-muted">{roleHelp[role]}</span>
        </label>
        <button disabled={pending} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {pending ? "Inviting…" : "Send invitation"}
        </button>
      </form>

      {!pending && state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {!pending && state.message && (
        <div className="space-y-2">
          <p role="status" className="text-sm text-green-700 dark:text-green-500">✓ {state.message}</p>
          {state.shareText && (
            <>
              <pre className="whitespace-pre-wrap rounded-md bg-surface-muted p-3 text-xs dark:bg-zinc-900">{state.shareText}</pre>
              <button type="button" onClick={() => copy(state.shareText!)} className="text-sm underline">
                {copied ? "Copied ✓" : "Copy message"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
