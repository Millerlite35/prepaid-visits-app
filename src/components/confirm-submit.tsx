"use client";

import { useState } from "react";

// A two-step submit button for risky actions: the first click asks, the second confirms.
// Used instead of the browser's confirm() pop-up, which some browsers and in-app browsers
// block silently (so the action never happens and nobody knows why).
export function ConfirmSubmit({
  label,
  question,
  confirmLabel,
  pending = false,
  pendingLabel = "Working…",
  className = "",
}: {
  label: string;
  question: string;
  confirmLabel: string;
  pending?: boolean;
  pendingLabel?: string;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);

  if (pending) {
    return <span className="text-sm">{pendingLabel}</span>;
  }
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={className}>
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-3 rounded-md bg-red-50 p-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
      <span>{question}</span>
      <button type="submit" className="rounded-md bg-red-600 px-3 py-1 font-medium text-white">
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setAsking(false)} className="underline">
        Keep it
      </button>
    </span>
  );
}
