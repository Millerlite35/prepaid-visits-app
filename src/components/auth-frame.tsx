import type { ReactNode } from "react";
import { brand } from "@/config/brand";
import { Wordmark } from "@/components/wordmark";

// Sign-in, sign-up, password and two-step pages. Wide screens: a navy brand panel on the
// left (a client's pass card carrying the wordmark, one reassuring line) and the form on plain
// white. Phones: the wordmark above the form, no panel.
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 bg-surface text-ink">
      <aside className="hidden w-[42%] max-w-xl shrink-0 flex-col bg-[var(--brand-primary)] px-12 py-10 text-white lg:flex">
        <div className="flex flex-1 flex-col justify-center">
          <PassCard />
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

// Decorative: a client's pass as a real wallet-sized card (credit-card proportions), the
// product wordmark printed on it, 6 of 10 visits left shown as punch dots
function PassCard() {
  return (
    <div
      aria-hidden
      className="theme-light relative flex aspect-[85.6/54] w-[22rem] -rotate-3 flex-col justify-between overflow-hidden rounded-xl bg-white p-6 text-ink shadow-[0_24px_48px_-12px_rgb(0_0_0/0.45),0_2px_6px_rgb(0_0_0/0.2)] [--wordmark-1:var(--brand-primary)] [--wordmark-2:var(--brand-accent)]"
    >
      {/* soft sheen, like light on a laminated card */}
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/0)_40%,rgb(244_246_248/0.9)_55%,rgb(255_255_255/0)_70%)]" />
      <div className="relative flex items-start justify-between">
        <Wordmark className="text-xl" />
        <span className="pt-1 text-[11px] text-ink-muted">Wellness visit card</span>
      </div>
      <div className="relative flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-ink-muted">Visits left</p>
          <p className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">
            6 <span className="text-sm font-normal tracking-normal text-ink-muted">of 10</span>
          </p>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={i < 4 ? "h-3 w-3 rounded-full border border-line" : "h-3 w-3 rounded-full bg-brand-accent"} />
            ))}
          </div>
        </div>
        <FakeQr className="h-[4.5rem] w-[4.5rem] shrink-0" />
      </div>
      <span className="absolute inset-x-0 bottom-0 h-1.5 bg-brand-accent" />
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
