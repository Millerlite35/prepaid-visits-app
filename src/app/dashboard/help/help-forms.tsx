"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import type { FaqTopic } from "@/config/help-faq";
import type { SupportState } from "./actions";

// ---------------------------------------------------------------- searchable FAQ
export function FaqList({ topics }: { topics: FaqTopic[] }) {
  const [query, setQuery] = useState("");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = topics
    .map((t) => ({
      ...t,
      items: t.items.filter((i) => words.every((w) => `${i.q} ${i.a}`.toLowerCase().includes(w))),
    }))
    .filter((t) => t.items.length > 0);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search help, e.g. refund, camera, staff"
        aria-label="Search help"
        className="block w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {shown.length === 0 && (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          No answers match that. Try other words, or contact support below.
        </p>
      )}
      {shown.map((t) => (
        <section key={t.id} className="mt-6">
          <h2 className="mb-2 font-medium">{t.title}</h2>
          <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {t.items.map((i) => (
              <details key={i.q} className="group p-3" open={words.length > 0}>
                <summary className="cursor-pointer list-none text-sm font-medium">
                  <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden>
                    ›
                  </span>
                  {i.q}
                </summary>
                <p className="mt-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">{i.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- contact support
const inputClass = "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

// the page they came from (read in the browser; empty during the server render)
const noSubscribe = () => () => {};
const referrerPath = () => {
  try {
    const ref = new URL(document.referrer);
    return ref.origin === window.location.origin ? ref.pathname : "";
  } catch {
    return "";
  }
};

export function SupportForm({
  action,
  topics,
  businesses,
}: {
  action: (prev: SupportState, formData: FormData) => Promise<SupportState>;
  topics: readonly { value: string; label: string }[];
  businesses: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const page = useSyncExternalStore(noSubscribe, referrerPath, () => "");

  if (state.message) {
    return (
      <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">
        ✓ {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="page" value={page} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">What&apos;s it about?</span>
          <select name="topic" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choose…
            </option>
            {topics.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {businesses.length > 0 && (
          <label className="block text-sm">
            <span className="font-medium">Which business?</span>
            <select name="providerId" defaultValue={businesses.length === 1 ? businesses[0].id : ""} className={inputClass}>
              <option value="">Not about a business</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label className="block text-sm">
        <span className="font-medium">Your message</span>
        <textarea name="message" required rows={6} maxLength={3000} className={inputClass} />
        <span className="mt-1 block text-xs text-zinc-500">
          Please don&apos;t include client health details. A client&apos;s name is fine if we need to look
          something up.
        </span>
      </label>
      {!pending && state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
