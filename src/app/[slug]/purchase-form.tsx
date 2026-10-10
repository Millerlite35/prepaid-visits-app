"use client";

import { useActionState, useState } from "react";
import { describeExpiry, formatCents } from "@/lib/packages";
import type { PublicPackage } from "@/lib/payments/checkout";
import type { PurchaseState } from "./actions";

type Props = {
  action: (prev: PurchaseState, formData: FormData) => Promise<PurchaseState>;
  packages: PublicPackage[];
  singular: string;
  plural: string;
  brandColor: string;
  termsText: string;
  termsVersion: number;
};

const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

export function PurchaseForm({ action, packages, singular, plural, brandColor, termsText, termsVersion }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [selected, setSelected] = useState(packages.length === 1 ? packages[0].id : "");
  const chosen = packages.find((p) => p.id === selected);

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="mb-2 font-medium">Choose a package</legend>
        {packages.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4"
            style={{ borderColor: selected === p.id ? brandColor : "rgb(228 228 231)" }}
          >
            <input
              type="radio"
              name="packageId"
              value={p.id}
              checked={selected === p.id}
              onChange={() => setSelected(p.id)}
              className="mt-1"
            />
            <span className="flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{p.name}</span>
                <span className="font-semibold">{formatCents(p.price_cents)}</span>
              </span>
              <span className="block text-sm">
                {p.visits} {p.visits === 1 ? singular : plural} · {formatCents(Math.round(p.price_cents / p.visits))} per {singular}
              </span>
              <span className="block text-xs text-zinc-500">{describeExpiry(p.expires_days)}</span>
              {p.description && <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">{p.description}</span>}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Full name</span>
          <input name="fullName" required maxLength={100} autoComplete="name" className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} />
          <span className="mt-1 block text-xs text-zinc-500">Your pass and receipt are sent here.</span>
        </label>
      </div>

      <div>
        <p className="text-sm font-medium">Terms</p>
        <div className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-zinc-200 p-3 text-xs leading-relaxed dark:border-zinc-800">
          {termsText}
        </div>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptTerms" required className="mt-1" />
          <span>I have read and accept these terms.</span>
        </label>
        <input type="hidden" name="termsVersion" value={termsVersion} />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        disabled={pending || !chosen}
        className="w-full rounded-md px-4 py-3 font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: brandColor }}
      >
        {pending ? "Starting secure payment…" : chosen ? `Continue to payment: ${formatCents(chosen.price_cents)}` : "Choose a package"}
      </button>
      <p className="text-center text-xs text-zinc-500">Payment is handled securely by Stripe.</p>
    </form>
  );
}
