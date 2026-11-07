"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui";

// Shown when a page crashes. The founder is already emailed about server errors
// (src/instrumentation.ts); this page only helps the person carry on.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-muted">We&apos;ve been told about it. Try again in a moment.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" onClick={() => retry()} className={buttonClass("primary")}>
          Try again
        </button>
        <Link href="/dashboard" className={buttonClass("secondary")}>
          Dashboard
        </Link>
      </div>
    </main>
  );
}
