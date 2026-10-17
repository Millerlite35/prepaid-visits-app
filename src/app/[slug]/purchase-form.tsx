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
  "mt-1.5 block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-ink shadow-sm outline-none transition placeholder:text-ink-muted/60 focus:border-transparent focus:ring-2";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 flex items-center gap-2 font-semibold text-ink">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-xs">{n}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function PurchaseForm({ action, packages, singular, plural, brandColor, termsText, termsVersion }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [selected, setSelected] = useState(packages.length === 1 ? packages[0].id : "");
  const [showTerms, setShowTerms] = useState(false);
  const chosen = packages.find((p) => p.id === selected);

  // "Best value": the lowest price per visit, when there's a real choice
  const perVisit = (p: PublicPackage) => p.price_cents / p.visits;
  const best = packages.length > 1 ? packages.reduce((a, b) => (perVisit(b) < perVisit(a) ? b : a)) : null;
  const ring = { "--tw-ring-color": brandColor } as React.CSSProperties;

  return (
    <form action={formAction} className="space-y-8">
      <Step n={1} title="Choose a package">
        <div className="space-y-3">
          {packages.map((p) => {
            const on = selected === p.id;
            return (
              <label
                key={p.id}
                className="relative flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4 transition hover:shadow-sm"
                style={{ borderColor: on ? brandColor : undefined, boxShadow: on ? `0 0 0 1px ${brandColor}` : undefined }}
              >
                <input type="radio" name="packageId" value={p.id} checked={on} onChange={() => setSelected(p.id)} className="sr-only" />
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                  style={{ borderColor: on ? brandColor : "var(--line)" }}
                >
                  {on && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: brandColor }} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-ink">
                      {p.name}
                      {best?.id === p.id && (
                        <span className="ml-2 rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold text-white" style={{ backgroundColor: brandColor }}>
                          Best value
                        </span>
                      )}
                    </span>
                    <span className="text-lg font-semibold text-ink tabular-nums">{formatCents(p.price_cents)}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-ink">
                    {p.visits} {p.visits === 1 ? singular : plural}
                    {p.visits > 1 && (
                      <span className="text-ink-muted">
                        {" "}
                        · {formatCents(Math.round(p.price_cents / p.visits))} per {singular}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-ink-muted">{describeExpiry(p.expires_days)}</span>
                  {p.description && <span className="mt-1.5 block text-sm text-ink-muted">{p.description}</span>}
                </span>
              </label>
            );
          })}
        </div>
      </Step>

      <Step n={2} title="Your details">
        <label className="block">
          <span className="text-sm font-medium text-ink">Full name</span>
          <input name="fullName" required maxLength={100} autoComplete="name" className={inputClass} style={ring} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Email</span>
          <input name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} style={ring} />
          <span className="mt-1.5 block text-xs text-ink-muted">Your pass and receipt are sent here.</span>
        </label>
      </Step>

      <Step n={3} title="Terms">
        <div className="rounded-xl border border-line bg-surface-muted/60">
          <button
            type="button"
            onClick={() => setShowTerms((v) => !v)}
            aria-expanded={showTerms}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-ink"
          >
            {showTerms ? "Hide the terms" : "Read the terms"}
            <span aria-hidden className={`transition ${showTerms ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>
          {showTerms && (
            <div className="max-h-60 overflow-y-auto border-t border-line px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap text-ink-muted">
              {termsText}
            </div>
          )}
        </div>
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4" style={{ accentColor: brandColor }} />
          <span>I have read and accept these terms.</span>
        </label>
        <input type="hidden" name="termsVersion" value={termsVersion} />
      </Step>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}
      <div>
        <button
          disabled={pending || !chosen}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: brandColor }}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <rect x="4" y="9" width="12" height="8" rx="1.5" />
            <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
          </svg>
          {pending ? "Starting secure payment…" : chosen ? `Continue to payment · ${formatCents(chosen.price_cents)}` : "Choose a package to continue"}
        </button>
        <p className="mt-2.5 text-center text-xs text-ink-muted">Secure payment by Stripe. Your card details never touch this site.</p>
      </div>
    </form>
  );
}
