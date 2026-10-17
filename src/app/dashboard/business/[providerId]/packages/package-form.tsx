"use client";

import { useActionState, useState } from "react";
import {
  EXPIRY_CHOICES,
  PACKAGE_LIMITS,
  discountPercent,
  expiryChoiceFor,
  formatCents,
  parseDiscount,
  parseMoneyToCents,
  presetPriceCents,
} from "@/lib/packages";
import type { PackageFormState } from "./actions";

const inputClass =
  "mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2";

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
  usualPriceCents: number | null; // regular price per visit (Page settings), for % off
};

export function PackageForm({ action, initial, vocabSingular, vocabPlural, submitLabel, usualPriceCents }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [visits, setVisits] = useState(initial ? String(initial.visits) : "");
  const [price, setPrice] = useState(initial ? (initial.price_cents / 100).toFixed(2) : "");
  const [expiry, setExpiry] = useState(expiryChoiceFor(initial?.expires_days ?? 365));

  // % off is only a helper for the price: the price is what's saved
  const [usual, setUsual] = useState(usualPriceCents ? String(usualPriceCents / 100) : "");
  const usualCents = parseMoneyToCents(usual);
  const startPct =
    initial && usualPriceCents ? String(Math.max(0, discountPercent(usualPriceCents, initial.visits, initial.price_cents))) : "";
  const [pct, setPct] = useState(startPct);

  const priceCents = parseMoneyToCents(price);
  const visitCount = Number(visits);
  const perVisit = priceCents && visitCount >= 1 ? Math.round(priceCents / visitCount) : null;

  const priceFor = (v: number, d: number) => (usualCents && v >= 1 ? (presetPriceCents(usualCents, v, d) / 100).toFixed(2) : null);
  function changePct(raw: string) {
    setPct(raw);
    const d = parseDiscount(raw);
    const next = d === null ? null : priceFor(visitCount, d);
    if (next) setPrice(next);
  }
  function changeVisits(raw: string) {
    setVisits(raw);
    const d = parseDiscount(pct);
    const next = d === null ? null : priceFor(Number(raw), d);
    if (next) setPrice(next);
  }
  function changePrice(raw: string) {
    setPrice(raw);
    const cents = parseMoneyToCents(raw);
    if (cents && usualCents && visitCount >= 1) setPct(String(Math.max(0, discountPercent(usualCents, visitCount, cents))));
  }

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
            onChange={(e) => changeVisits(e.target.value)}
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
            onChange={(e) => changePrice(e.target.value)}
            placeholder="240.00"
            className={inputClass}
          />
        </label>
      </div>
      {perVisit !== null && (
        <p className="-mt-2 text-xs text-ink-muted">
          {formatCents(perVisit)} per {vocabSingular}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-surface-muted p-3 text-sm">
        <label className="block">
          <span className="text-xs font-medium text-ink-muted">Regular price per {vocabSingular}</span>
          <span className="mt-1 flex items-center gap-1">
            $
            <input
              value={usual}
              inputMode="decimal"
              onChange={(e) => setUsual(e.target.value)}
              placeholder="150"
              className="w-24 rounded-lg border border-line bg-surface px-2 py-1.5"
            />
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-muted">% off</span>
          <span className="mt-1 flex items-center gap-1">
            <input
              value={pct}
              inputMode="numeric"
              onChange={(e) => changePct(e.target.value)}
              disabled={!usualCents}
              placeholder="10"
              className="w-16 rounded-lg border border-line bg-surface px-2 py-1.5 text-right disabled:opacity-50"
            />
            %
          </span>
        </label>
        <p className="min-w-[12rem] flex-1 text-xs text-ink-muted">
          Type a % off to work out the price, or type the price yourself. Only the price is saved.
          {!usualPriceCents && " Tip: set your regular price in Page settings so it fills in here."}
        </p>
      </div>

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
      <p className="text-xs text-ink-muted">
        Some states limit expiration dates on prepaid services. Check with your attorney before
        choosing one.
      </p>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
