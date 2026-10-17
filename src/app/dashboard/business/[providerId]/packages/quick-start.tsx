"use client";

import { useActionState, useState } from "react";
import { packagePresets } from "@/config/package-presets";
import { MAX_DISCOUNT_PERCENT, describeExpiry, formatCents, parseDiscount, parseMoneyToCents, presetPriceCents } from "@/lib/packages";
import type { PackageFormState } from "./actions";

type Props = {
  action: (prev: PackageFormState, formData: FormData) => Promise<PackageFormState>;
  vocabSingular: string;
  vocabPlural: string;
  usualPriceCents: number | null; // from Page settings, to fill in the price box
};

// "Quick start": enter your usual price for one visit, tick the suggested packages you want,
// and change any package's % off.
export function QuickStart({ action, vocabSingular, vocabPlural, usualPriceCents }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [perVisit, setPerVisit] = useState(usualPriceCents ? String(usualPriceCents / 100) : "");
  const [discounts, setDiscounts] = useState<Record<string, string>>(
    Object.fromEntries(packagePresets.map((p) => [p.id, String(p.discountPercent)])),
  );
  const perVisitCents = parseMoneyToCents(perVisit);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Your usual price for one {vocabSingular}</span>
        <input
          name="perVisit"
          inputMode="decimal"
          required
          value={perVisit}
          onChange={(e) => setPerVisit(e.target.value)}
          placeholder="80.00"
          className="mt-1 block w-40 rounded-md border border-line bg-surface px-3 py-2"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Packages to add</legend>
        {packagePresets.map((p) => {
          const pct = parseDiscount(discounts[p.id] ?? "");
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
              <label className="flex min-w-0 flex-1 items-start gap-3">
                <input type="checkbox" name="preset" value={p.id} defaultChecked={p.selectedByDefault} className="mt-1" />
                <span>
                  <span className="font-medium">{p.name}</span>: {p.visits} {vocabPlural}
                  {perVisitCents && pct !== null ? <> for {formatCents(presetPriceCents(perVisitCents, p.visits, pct))}</> : null}
                  <span className="block text-xs text-ink-muted">{describeExpiry(p.expiresDays)}</span>
                </span>
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  name={`discount_${p.id}`}
                  inputMode="numeric"
                  value={discounts[p.id] ?? ""}
                  onChange={(e) => setDiscounts((d) => ({ ...d, [p.id]: e.target.value }))}
                  aria-label={`${p.name} percent off`}
                  className={`w-14 rounded-lg border bg-surface px-2 py-1.5 text-right ${pct === null ? "border-red-400" : "border-line"}`}
                />
                % off
              </label>
            </div>
          );
        })}
        <p className="text-xs text-ink-muted">Change any % off (0 to {MAX_DISCOUNT_PERCENT}). Prices round to whole dollars.</p>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60">
        {pending ? "Adding…" : "Add selected packages"}
      </button>
      <p className="text-xs text-ink-muted">You can rename or change any of these after adding them.</p>
    </form>
  );
}
