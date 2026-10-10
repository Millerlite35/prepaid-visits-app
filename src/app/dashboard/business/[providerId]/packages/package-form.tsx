"use client";

import { useActionState, useState } from "react";
import { EXPIRY_CHOICES, PACKAGE_LIMITS, expiryChoiceFor, formatCents, parseMoneyToCents } from "@/lib/packages";
import type { PackageFormState } from "./actions";

const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

export type PackageValues = {
  name: string;
  description: string | null;
  visits: number;
  price_cents: number;
  expires_days: number | null;
};

type Props = {
  action: (prev: PackageFormState, formData: FormData) => Promise<PackageFormState>;
  initial?: PackageValues;
  vocabSingular: string;
  vocabPlural: string;
  submitLabel: string;
};

export function PackageForm({ action, initial, vocabSingular, vocabPlural, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [visits, setVisits] = useState(initial ? String(initial.visits) : "");
  const [price, setPrice] = useState(initial ? (initial.price_cents / 100).toFixed(2) : "");
  const [expiry, setExpiry] = useState(expiryChoiceFor(initial?.expires_days ?? 365));

  const priceCents = parseMoneyToCents(price);
  const visitCount = Number(visits);
  const perVisit = priceCents && visitCount >= 1 ? Math.round(priceCents / visitCount) : null;

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Package name</span>
        <input name="name" required maxLength={PACKAGE_LIMITS.nameMax} defaultValue={initial?.name} placeholder="Standard" className={inputClass} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Description (optional)</span>
        <textarea
          name="description"
          rows={2}
          maxLength={PACKAGE_LIMITS.descriptionMax}
          defaultValue={initial?.description ?? ""}
          placeholder="Our most popular option"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">Number of {vocabPlural}</span>
          <input
            name="visits"
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={PACKAGE_LIMITS.visitsMax}
            value={visits}
            onChange={(e) => setVisits(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Price (USD)</span>
          <input
            name="price"
            inputMode="decimal"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="240.00"
            className={inputClass}
          />
        </label>
      </div>
      {perVisit !== null && (
        <p className="-mt-2 text-xs text-zinc-500">
          {formatCents(perVisit)} per {vocabSingular}
        </p>
      )}

      <label className="block">
        <span className="text-sm font-medium">Expiry</span>
        <select name="expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputClass}>
          {EXPIRY_CHOICES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      {expiry === "custom" && (
        <label className="block">
          <span className="text-sm font-medium">Expires after how many days?</span>
          <input
            name="expiresCustomDays"
            type="number"
            inputMode="numeric"
            min={1}
            max={PACKAGE_LIMITS.expiresDaysMax}
            defaultValue={initial?.expires_days ?? ""}
            className={inputClass}
          />
        </label>
      )}
      <p className="text-xs text-zinc-500">
        Some states limit expiration dates on prepaid services. Check with your attorney before
        choosing one.
      </p>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
