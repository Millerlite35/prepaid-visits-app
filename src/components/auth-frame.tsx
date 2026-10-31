import type { ReactNode } from "react";
import { brand } from "@/config/brand";
import { Icon } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";

// Sign-in, sign-up, password and two-step pages. Wide screens: a navy brand panel on the
// left (wordmark, a sketch of a client's pass, one reassuring line) and the form on plain
// white. Phones: the wordmark above the form, no panel.
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 bg-surface text-ink">
      <aside className="hidden w-[42%] max-w-xl shrink-0 flex-col justify-between bg-brand px-12 py-10 text-white [--wordmark-1:#fff] [--wordmark-2:var(--brand-accent-on-dark)] lg:flex">
        <p className="text-2xl">
          <Wordmark />
        </p>
        <div>
          <PassSketch />
          <p className="mt-12 max-w-md font-display text-3xl leading-tight text-balance">{brand.tagline}, checked in with one scan.</p>
        </div>
        <p className="max-w-sm text-sm text-white/70">A client&apos;s pass holds only a random code, never their name.</p>
      </aside>

      <div className="flex flex-1 flex-col items-center px-4 py-10 lg:justify-center">
        <p className="text-3xl lg:hidden">
          <Wordmark />
        </p>
        <div className="mt-8 w-full max-w-sm lg:mt-0 [&>main]:px-0 [&>main]:py-0">{children}</div>
      </div>
    </div>
  );
}

// Decorative: a client's pass with 6 of 10 visits left, drawn as punch dots
function PassSketch() {
  return (
    <div aria-hidden className="theme-light w-72 -rotate-2 rounded-xl bg-white p-5 text-ink">
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>Wellness visit card</span>
        <Icon name="scan" className="h-5 w-5" />
      </div>
      <p className="mt-8 text-sm text-ink-muted">Visits left</p>
      <p className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">
        6 <span className="text-base font-normal tracking-normal text-ink-muted">of 10</span>
      </p>
      <div className="mt-4 grid grid-cols-10 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={i < 4 ? "aspect-square rounded-full border border-line" : "aspect-square rounded-full bg-brand-accent"} />
        ))}
      </div>
    </div>
  );
}
