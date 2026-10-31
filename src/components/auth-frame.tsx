import type { ReactNode } from "react";
import { brand } from "@/config/brand";
import { Wordmark } from "@/components/wordmark";

// Sign-in, sign-up, password and two-step pages. Wide screens: a navy brand panel on the
// left (wordmark, a sketch of a client's pass, one reassuring line) and the form on plain
// white. Phones: the wordmark above the form, no panel.
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 bg-surface text-ink">
      <aside className="hidden w-[42%] max-w-xl shrink-0 flex-col justify-between bg-[var(--brand-primary)] px-12 py-10 text-white [--wordmark-1:#fff] [--wordmark-2:var(--brand-accent-on-dark)] lg:flex">
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
      <p className="text-xs text-ink-muted">Wellness visit card</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">Visits left</p>
          <p className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">
            6 <span className="text-base font-normal tracking-normal text-ink-muted">of 10</span>
          </p>
        </div>
        <FakeQr className="h-16 w-16 shrink-0" />
      </div>
      <div className="mt-4 grid grid-cols-10 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={i < 4 ? "aspect-square rounded-full border border-line" : "aspect-square rounded-full bg-brand-accent"} />
        ))}
      </div>
    </div>
  );
}

// Looks like a QR code but isn't one: three corner squares plus a fixed made-up pattern,
// so it can never be scanned (real pass QR codes hold only a token, hard rule 2)
function FakeQr({ className }: { className?: string }) {
  const n = 21;
  const nearCorner = (x: number, y: number) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!nearCorner(x, y) && (x * 73 + y * 151 + x * y * 17) % 7 < 3) cells.push([x, y]);
    }
  }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className={className} shapeRendering="crispEdges" fill="currentColor">
      {[
        [0, 0],
        [n - 7, 0],
        [0, n - 7],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x + 0.5} y={y + 0.5} width={6} height={6} fill="none" stroke="currentColor" strokeWidth={1} />
          <rect x={x + 2} y={y + 2} width={3} height={3} />
        </g>
      ))}
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
      ))}
    </svg>
  );
}
