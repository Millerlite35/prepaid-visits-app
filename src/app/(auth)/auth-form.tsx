"use client";

import { useActionState } from "react";
import { signIn, signUp, type FormState } from "./actions";

const inputClass =
  "mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const isSignup = mode === "signup";
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    isSignup ? signUp : signIn,
    {},
  );

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
      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={isSignup ? 12 : undefined}
          autoComplete={isSignup ? "new-password" : "current-password"}
          className={inputClass}
        />
        {isSignup && <span className="mt-1 block text-xs text-ink-muted">At least 12 characters.</span>}
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
