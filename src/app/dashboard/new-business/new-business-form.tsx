"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { checkSlug, slugify } from "@/lib/slug";
import { createBusiness, type BusinessFormState } from "./actions";

const inputClass =
  "mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2";

// The browser's time zone, read without a server/browser mismatch (empty on the server).
const noSubscribe = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function NewBusinessForm({ siteHost }: { siteHost: string }) {
  const [state, formAction, pending] = useActionState<BusinessFormState, FormData>(createBusiness, {});
  const [name, setName] = useState("");
  const [customSlug, setCustomSlug] = useState<string | null>(null); // null = follow the name
  const timezone = useSyncExternalStore(noSubscribe, browserTimeZone, () => "");

  const slug = customSlug ?? slugify(name);
  const slugProblem = slug ? checkSlug(slug) : null;

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Business name</span>
        <input
          name="name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Northshore Chiropractic"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Web address</span>
        <input
          name="slug"
          required
          maxLength={40}
          value={slug}
          onChange={(e) => setCustomSlug(e.target.value.toLowerCase())}
          autoCapitalize="none"
          spellCheck={false}
          className={inputClass}
        />
        <span className="mt-1 block break-all text-xs text-ink-muted">
          {siteHost}/{slug || "your-business"}
        </span>
        {slug && slugProblem && <span className="mt-1 block text-xs text-red-600">{slugProblem}</span>}
      </label>

      <input type="hidden" name="timezone" value={timezone} />

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        disabled={pending || !name.trim() || !!slugProblem}
        className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create business"}
      </button>
      <p className="text-xs text-ink-muted">
        Your purchase page starts private. You can change the name, web address and page
        settings later.
      </p>
    </form>
  );
}
