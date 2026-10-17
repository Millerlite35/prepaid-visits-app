"use client";

import { useActionState, useState } from "react";
import {
  BRAND_COLOR_SWATCHES,
  PROFESSION_PRESETS,
  SETTINGS_LIMITS,
  US_TIMEZONES,
  contrastWithWhite,
  isHexColor,
  passLabelProblem,
  starterTerms,
} from "@/lib/page-settings";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { checkSlug } from "@/lib/slug";
import type { SettingsState } from "./actions";

type Action = (prev: SettingsState, formData: FormData) => Promise<SettingsState>;

const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

function Result({ state, pending }: { state: SettingsState; pending: boolean }) {
  if (pending) return null;
  if (state.error) return <p role="alert" className="text-sm text-red-600">{state.error}</p>;
  if (state.saved) return <p role="status" className="text-sm text-green-700 dark:text-green-500">✓ Saved</p>;
  return null;
}

function SaveButton({ pending, label = "Save" }: { pending: boolean; label?: string }) {
  return (
    <button disabled={pending} className="rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-60">
      {pending ? "Saving…" : label}
    </button>
  );
}

// ---------------------------------------------------------------- page details
export type PageDetails = {
  display_name: string;
  brand_color: string;
  vocab_singular: string;
  vocab_plural: string;
  pass_label: string;
  profession_template: string | null;
  timezone: string;
};

export function PageDetailsForm({ action, initial }: { action: Action; initial: PageDetails }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [profession, setProfession] = useState(initial.profession_template ?? "");
  const [singular, setSingular] = useState(initial.vocab_singular);
  const [plural, setPlural] = useState(initial.vocab_plural);
  const [passLabel, setPassLabel] = useState(initial.pass_label);
  const [color, setColor] = useState(initial.brand_color.toUpperCase());

  function chooseProfession(id: string) {
    setProfession(id);
    const preset = PROFESSION_PRESETS.find((p) => p.id === id);
    if (preset) {
      setSingular(preset.singular);
      setPlural(preset.plural);
      setPassLabel(preset.passLabel);
    }
  }

  const labelProblem = passLabelProblem(passLabel);
  const lowContrast = isHexColor(color) && contrastWithWhite(color) < 4.5;
  const timezones = US_TIMEZONES.some((t) => t.value === initial.timezone)
    ? US_TIMEZONES
    : [{ value: initial.timezone, label: initial.timezone }, ...US_TIMEZONES];

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Business name</span>
        <input name="displayName" required maxLength={SETTINGS_LIMITS.nameMax} defaultValue={initial.display_name} className={inputClass} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Type of business</span>
        <select name="profession" value={profession} onChange={(e) => chooseProfession(e.target.value)} className={inputClass}>
          <option value="">Choose to fill in suggested wording…</option>
          {PROFESSION_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">One is called a…</span>
          <input name="vocabSingular" required maxLength={SETTINGS_LIMITS.vocabMax} value={singular} onChange={(e) => setSingular(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Several are called…</span>
          <input name="vocabPlural" required maxLength={SETTINGS_LIMITS.vocabMax} value={plural} onChange={(e) => setPlural(e.target.value)} className={inputClass} />
        </label>
      </div>
      <p className="-mt-2 text-xs text-zinc-500">
        Shown to clients, e.g. &ldquo;6 {plural || "visits"} for $450&rdquo;.
      </p>

      <label className="block">
        <span className="text-sm font-medium">Label on the client&apos;s pass</span>
        <input name="passLabel" required maxLength={SETTINGS_LIMITS.passLabelMax} value={passLabel} onChange={(e) => setPassLabel(e.target.value)} className={inputClass} />
        {labelProblem ? (
          <span className="mt-1 block text-xs text-red-600">{labelProblem}</span>
        ) : (
          <span className="mt-1 block text-xs text-zinc-500">Keep it neutral. Others may see it on a client&apos;s phone.</span>
        )}
      </label>

      <div>
        <span className="text-sm font-medium">Brand colour</span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {BRAND_COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Use colour ${c}`}
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-zinc-900 dark:border-white" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            name="brandColor"
            type="color"
            value={isHexColor(color) ? color.toLowerCase() : "#1b4d3e"}
            onChange={(e) => setColor(e.target.value.toUpperCase())}
            aria-label="Custom colour"
            className="h-8 w-12 cursor-pointer rounded border border-zinc-300 dark:border-zinc-700"
          />
          <span className="rounded-md px-3 py-1 text-sm font-medium text-white" style={{ backgroundColor: color }}>
            Buy now
          </span>
        </div>
        {lowContrast && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">
            This colour is light, so white text on it may be hard to read. A darker shade works better.
          </p>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-medium">Time zone</span>
        <select name="timezone" defaultValue={initial.timezone} className={inputClass}>
          {timezones.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <Result state={state} pending={pending} />
      <SaveButton pending={pending} />
    </form>
  );
}

// ---------------------------------------------------------------- address and access
export function AddressForm({
  action,
  initialSlug,
  initialAccess,
  siteHost,
}: {
  action: Action;
  initialSlug: string;
  initialAccess: "public" | "private";
  siteHost: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [slug, setSlug] = useState(initialSlug);
  const slugProblem = checkSlug(slug);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Web address</span>
        <input
          name="slug"
          required
          maxLength={40}
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          autoCapitalize="none"
          spellCheck={false}
          className={inputClass}
        />
        <span className="mt-1 block break-all text-xs text-zinc-500">{siteHost}/{slug}</span>
        {slugProblem && <span className="mt-1 block text-xs text-red-600">{slugProblem}</span>}
        {slug !== initialSlug && !slugProblem && (
          <span className="mt-1 block text-xs text-amber-700 dark:text-amber-500">
            Changing this breaks old links, flyers and QR codes that use the current address.
          </span>
        )}
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Who can open your purchase page?</legend>
        <label className="mt-2 flex items-start gap-2 text-sm">
          <input type="radio" name="pageAccess" value="private" defaultChecked={initialAccess === "private"} className="mt-1" />
          <span>
            <span className="font-medium">Private</span>: only people you give the private link to.
          </span>
        </label>
        <label className="mt-2 flex items-start gap-2 text-sm">
          <input type="radio" name="pageAccess" value="public" defaultChecked={initialAccess === "public"} className="mt-1" />
          <span>
            <span className="font-medium">Public</span>: anyone with your web address.
          </span>
        </label>
      </fieldset>

      <Result state={state} pending={pending} />
      <SaveButton pending={pending || !!slugProblem} />
    </form>
  );
}

export function PrivateLink({ url, renewAction }: { url: string; renewAction: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Private link</p>
      <p className="break-all rounded-md bg-zinc-100 p-2 font-mono text-xs dark:bg-zinc-900">{url}</p>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <button type="button" onClick={copy} className="underline">
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <form action={renewAction}>
          <ConfirmSubmit
            label="Make a new link"
            question="The current link will stop working. Continue?"
            confirmLabel="Yes, new link"
            className="underline"
          />
        </form>
      </div>
      <p className="text-xs text-zinc-500">
        Make a new link if the old one was shared more widely than you wanted.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- terms
export function TermsForm({
  action,
  initialTerms,
  version,
  businessName,
  singular,
  plural,
}: {
  action: Action;
  initialTerms: string;
  version: number;
  businessName: string;
  singular: string;
  plural: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [terms, setTerms] = useState(initialTerms);
  const [askReplace, setAskReplace] = useState(false);

  function applyTemplate() {
    setTerms(starterTerms(businessName, singular, plural));
    setAskReplace(false);
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          Version {version}. Each saved change becomes a new version, and every sale records
          which version the client accepted.
        </p>
        {askReplace ? (
          <span className="inline-flex flex-wrap items-center gap-3 rounded-md bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Replace your current terms?
            <button type="button" onClick={applyTemplate} className="rounded-md bg-amber-600 px-3 py-1 font-medium text-white">
              Yes, replace
            </button>
            <button type="button" onClick={() => setAskReplace(false)} className="underline">
              Keep mine
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => (terms.trim() ? setAskReplace(true) : applyTemplate())} className="text-sm underline">
            Use starter template
          </button>
        )}
      </div>
      <textarea
        name="terms"
        rows={14}
        maxLength={SETTINGS_LIMITS.termsMax}
        value={terms}
        onChange={(e) => setTerms(e.target.value)}
        placeholder="Explain expiration, refunds of unused visits, what happens if you stop offering services, and transfers."
        className={`${inputClass} font-mono text-sm`}
      />
      <p className="text-xs text-zinc-500">
        {terms.length.toLocaleString()} / {SETTINGS_LIMITS.termsMax.toLocaleString()} characters. The starter
        template is a plain-language starting point, not legal advice. Have your attorney review your terms.
      </p>
      {!terms.trim() && (
        <p className="text-xs text-amber-700 dark:text-amber-500">
          Clients won&apos;t be able to buy until you add terms.
        </p>
      )}
      <Result state={state} pending={pending} />
      <SaveButton pending={pending} label="Save terms" />
    </form>
  );
}

// ---------------------------------------------------------------- office contact
export function ContactForm({
  action,
  initial,
}: {
  action: Action;
  initial: { address: string | null; phone: string | null; website: string | null };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Office address</span>
        <input name="address" defaultValue={initial.address ?? ""} maxLength={200} autoComplete="street-address" placeholder="12 Main St, Springfield, IL 62701" className={inputClass} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Phone</span>
        <input name="phone" defaultValue={initial.phone ?? ""} maxLength={40} inputMode="tel" autoComplete="tel" placeholder="(555) 010-0000" className={inputClass} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Website</span>
        <input name="website" defaultValue={initial.website ?? ""} maxLength={100} autoCapitalize="none" spellCheck={false} placeholder="yourpractice.com" className={inputClass} />
      </label>
      <p className="text-xs text-zinc-500">All optional. Leave a box empty to leave it off.</p>
      <Result state={state} pending={pending} />
      <SaveButton pending={pending} />
    </form>
  );
}
