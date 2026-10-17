"use client";

import { useActionState, useRef, useState } from "react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { formatCents, parseMoneyToCents } from "@/lib/packages";
import type { MoneyState } from "./money-actions";

type Action = (prev: MoneyState, formData: FormData) => Promise<MoneyState>;

const inputClass = "mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2";

function Result({ state, pending }: { state: MoneyState; pending: boolean }) {
  if (pending) return null;
  if (state.error) return <p role="alert" className="text-sm text-red-600">{state.error}</p>;
  if (state.message) return <p role="status" className="text-sm text-green-700 dark:text-green-500">✓ {state.message}</p>;
  return null;
}

// ---------------------------------------------------------------- refund one purchase
export function RefundForm({
  action,
  remaining,
  refundableCents,
  perVisitCents,
  plural,
}: {
  action: Action;
  remaining: number;
  refundableCents: number;
  perVisitCents: number;
  plural: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  const [visits, setVisits] = useState(String(remaining));
  const [amount, setAmount] = useState<string | null>(null); // null = follow the suggestion
  const requestId = useRef<string | null>(null);
  const requestInput = useRef<HTMLInputElement>(null);

  const visitCount = /^\d+$/.test(visits) ? Math.min(Number(visits), remaining) : 0;
  const suggested = Math.min(refundableCents, visitCount * perVisitCents);
  const shownAmount = amount ?? (suggested / 100).toFixed(2);
  const amountCents = parseMoneyToCents(shownAmount);
  const tooMuch = amountCents !== null && amountCents > refundableCents;

  if (!open) {
    return (
      <div className="space-y-1">
        <button type="button" onClick={() => setOpen(true)} className="text-sm underline">
          Refund…
        </button>
        <Result state={state} pending={pending} />
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={() => {
        // One id per refund attempt, so a double click can't refund twice. Once the last
        // attempt has a result (done or failed), the next submit is a new attempt.
        if (state.message || state.error) requestId.current = null;
        requestId.current ??= crypto.randomUUID();
        if (requestInput.current) requestInput.current.value = requestId.current;
      }}
      className="mt-2 space-y-3 rounded-md border border-line p-3"
    >
      <input ref={requestInput} type="hidden" name="requestId" defaultValue="" />
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="font-medium">Unused {plural} to cancel</span>
          <input
            name="visits"
            type="number"
            min={0}
            max={remaining}
            value={visits}
            onChange={(e) => {
              setVisits(e.target.value);
              setAmount(null);
            }}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-ink-muted">{remaining} unused on this purchase</span>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Refund amount (USD)</span>
          <input name="amount" inputMode="decimal" value={shownAmount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
          <span className={`mt-1 block text-xs ${tooMuch ? "text-red-600" : "text-ink-muted"}`}>
            Up to {formatCents(refundableCents)} · suggested {formatCents(suggested)}
          </span>
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">Reason (optional, for your records)</span>
        <input name="reason" maxLength={200} className={inputClass} />
      </label>
      <p className="text-xs text-ink-muted">
        The money goes back to the client&apos;s card from your Stripe account, and our platform fee is refunded
        to you in proportion. The cancelled {plural} come off their balance straight away.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {amountCents && !tooMuch ? (
          <ConfirmSubmit
            label={`Refund ${formatCents(amountCents)}`}
            question={`Refund ${formatCents(amountCents)} and cancel ${visitCount} ${plural}? This can't be undone.`}
            confirmLabel="Yes, refund"
            pending={pending}
            pendingLabel="Refunding…"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white"
          />
        ) : (
          <span className="text-sm text-ink-muted">Enter an amount up to {formatCents(refundableCents)}.</span>
        )}
        <button type="button" onClick={() => setOpen(false)} className="text-sm underline">
          Close
        </button>
      </div>
      <Result state={state} pending={pending} />
    </form>
  );
}

// ---------------------------------------------------------------- add / remove visits
export function AdjustForm({ action, plural }: { action: Action; plural: string }) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="font-medium">Change</span>
          <select name="direction" defaultValue="add" className={inputClass}>
            <option value="add">Add</option>
            <option value="remove">Remove</option>
          </select>
        </label>
        <label className="block w-24 text-sm">
          <span className="font-medium">How many</span>
          <input name="count" type="number" min={1} max={100} defaultValue={1} required className={inputClass} />
        </label>
        <span className="pb-2 text-sm">{plural}</span>
      </div>
      <label className="block text-sm">
        <span className="font-medium">Reason (required)</span>
        <input name="note" required maxLength={200} placeholder="e.g. Make-up for a cancelled class" className={inputClass} />
      </label>
      <button disabled={pending} className="rounded-md border border-line px-4 py-2 text-sm font-medium disabled:opacity-50">
        {pending ? "Saving…" : "Save change"}
      </button>
      <p className="text-xs text-ink-muted">
        For corrections and goodwill. No money moves. The reason is kept in the client&apos;s history.
      </p>
      <Result state={state} pending={pending} />
    </form>
  );
}
