"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { checkSlug, slugify } from "@/lib/slug";
import { createBusiness, type BusinessFormState } from "./actions";

const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

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
        <span className="mt-1 block break-all text-xs text-zinc-500">
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
        className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create business"}
      </button>
      <p className="text-xs text-zinc-500">
        Your purchase page starts private. You can change the name, web address and page
        settings later.
      </p>
    </form>
  );
}
