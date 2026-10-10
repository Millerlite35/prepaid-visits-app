"use client";

import { useActionState } from "react";
import { confirmEnrollment, startEnrollment, type EnrollState } from "../actions";
import { CodeForm } from "../code-form";

export function SetupFlow() {
  const [enroll, startAction, starting] = useActionState<EnrollState>(() => startEnrollment(), {});

  if (!enroll.factorId) {
    return (
      <form action={startAction} className="mt-6 space-y-3">
        {enroll.error && (
          <p role="alert" className="text-sm text-red-600">
            {enroll.error}
          </p>
        )}
        <button
          disabled={starting}
          className="rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {starting ? "Preparing…" : "Set up authenticator app"}
        </button>
      </form>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>Open an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, 1Password…).</li>
        <li>Add an account and scan this QR code.</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      <p className="text-xs text-zinc-500">
        Scanned a code here before? Delete that older entry from your app. Only this new one will work.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- QR code is an inline data URL, nothing to optimize */}
      <img
        src={enroll.qrCode}
        alt="QR code for your authenticator app"
        width={180}
        height={180}
        className="rounded bg-white p-2"
      />
      <p className="text-xs text-zinc-500">
        Can&apos;t scan? Enter this setup key instead:{" "}
        <code className="select-all break-all">{enroll.secret}</code>
      </p>
      <CodeForm action={confirmEnrollment} factorId={enroll.factorId} submitLabel="Turn on two-step verification" />
    </div>
  );
}
