"use client";

import { useActionState, useState } from "react";
import { packagePresets } from "@/config/package-presets";
import { describeExpiry, formatCents, parseMoneyToCents, presetPriceCents } from "@/lib/packages";
import type { PackageFormState } from "./actions";

type Props = {
  action: (prev: PackageFormState, formData: FormData) => Promise<PackageFormState>;
  vocabSingular: string;
  vocabPlural: string;
};

// "Quick start": enter your usual price for one visit, tick the suggested packages you want.
export function QuickStart({ action, vocabSingular, vocabPlural }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [perVisit, setPerVisit] = useState("");
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
          className="mt-1 block w-40 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Packages to add</legend>
        {packagePresets.map((p) => (
          <label
            key={p.id}
            className="flex items-start gap-3 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
          >
            <input type="checkbox" name="preset" value={p.id} defaultChecked={p.selectedByDefault} className="mt-1" />
            <span>
              <span className="font-medium">{p.name}</span>: {p.visits} {vocabPlural}
              {perVisitCents ? (
                <> for {formatCents(presetPriceCents(perVisitCents, p.visits, p.discountPercent))}</>
              ) : null}
              <span className="block text-xs text-zinc-500">
                {p.discountPercent}% off · {describeExpiry(p.expiresDays)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Adding…" : "Add selected packages"}
      </button>
      <p className="text-xs text-zinc-500">You can rename or change any of these after adding them.</p>
    </form>
  );
}
