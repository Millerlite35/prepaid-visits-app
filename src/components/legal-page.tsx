import Link from "next/link";
import type { ReactNode } from "react";
import { legal } from "@/config/legal";
import { Wordmark } from "@/components/wordmark";

// Shared frame for /privacy and /terms: plain reading page, wordmark on top.
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-canvas text-ink">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-14">
        <Link href="/" aria-label="Home">
          <Wordmark className="text-lg" />
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-ink-muted">Last updated {legal.lastUpdated}</p>
        {!legal.attorneyReviewed && (
          <p className="mt-4 rounded-md border border-warning-line bg-warning-soft px-3 py-2 text-sm">
            Draft: this page is waiting for review by our attorney and may change before launch.
          </p>
        )}
        <div className="legal mt-8 space-y-8 text-sm leading-relaxed">{children}</div>
        <footer className="mt-12 flex gap-4 border-t border-line pt-6 text-xs text-ink-muted">
          <Link href="/privacy" className="underline">Privacy</Link>
          <Link href="/terms" className="underline">Terms</Link>
          <a href={`mailto:${legal.contactEmail}`} className="underline">{legal.contactEmail}</a>
        </footer>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
