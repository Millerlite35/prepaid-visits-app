"use client";

import { useActionState } from "react";
import { requestPasswordReset, setNewPassword, type PasswordState } from "./password-actions";

const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

function Result({ state, pending }: { state: PasswordState; pending: boolean }) {
  if (pending) return null;
  if (state.error) return <p role="alert" className="text-sm text-red-600">{state.error}</p>;
  return null;
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {});

  if (state.message) {
    return (
      <p role="status" className="mt-6 rounded-md bg-green-50 p-3 text-sm text-green-800">
        {state.message}
      </p>
    );
  }
  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>
      <Result state={state} pending={pending} />
      <button disabled={pending} className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}

export function NewPasswordForm({ needsCode }: { needsCode: boolean }) {
  const [state, formAction, pending] = useActionState(setNewPassword, {});

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">New password</span>
        <input name="password" type="password" required minLength={12} autoComplete="new-password" className={inputClass} />
        <span className="mt-1 block text-xs text-zinc-500">At least 12 characters.</span>
      </label>
      <label className="block">
        <span className="text-sm font-medium">Type it again</span>
        <input name="confirm" type="password" required minLength={12} autoComplete="new-password" className={inputClass} />
      </label>
      {needsCode && (
        <label className="block">
          <span className="text-sm font-medium">6-digit code from your authenticator app</span>
          <input
            name="code"
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            required
            className={`${inputClass} w-56 text-lg tracking-widest`}
          />
          <span className="mt-1 block text-xs text-zinc-500">
            This proves it&apos;s really you, even if someone else got into your email. Lost your phone?
            Enter one of your backup codes here instead.
          </span>
        </label>
      )}
      <Result state={state} pending={pending} />
      <button disabled={pending} className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
