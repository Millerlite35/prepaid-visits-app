import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

// Shared building blocks for the staff dashboard, so every page has the same look.
// Colours come from the tokens in globals.css (canvas, surface, line, ink) plus the
// provider/brand colour; no product name or brand colour is hardcoded here.

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON: Record<ButtonVariant, string> = {
  primary: "bg-brand text-on-brand shadow-sm hover:opacity-90",
  secondary: "border border-line bg-surface text-ink shadow-sm hover:bg-surface-muted",
  ghost: "text-ink hover:bg-surface-muted",
  danger: "bg-danger-solid text-white shadow-sm hover:opacity-90",
};

// For <button>, <a> and <Link>: buttonClass("primary")
export function buttonClass(variant: ButtonVariant = "primary", size: "sm" | "md" = "md"): string {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
    BUTTON[variant],
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-medium tracking-wide text-ink-muted uppercase">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cx("rounded-xl border border-line bg-surface", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? "px-5 py-4" : undefined}>{children}</div>
    </section>
  );
}

export type Trend = { text: string; direction: "up" | "down" | "flat" };

// One panel holding several Stats, split by hairlines (the gap shows the line colour through)
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("grid gap-px overflow-hidden rounded-xl border border-line bg-line", className)}>{children}</section>;
}

// Use inside <StatStrip>
export function Stat({ label, value, trend, hint }: { label: ReactNode; value: ReactNode; trend?: Trend; hint?: ReactNode }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-ink tabular-nums">{value}</p>
      {trend && (
        <p className="mt-1.5 text-xs text-ink-muted">
          <span
            className={cx(
              "mr-1 inline-flex items-center rounded-full px-1.5 py-0.5 font-medium",
              trend.direction === "up" && "bg-success-soft text-success",
              trend.direction === "down" && "bg-danger-soft text-danger",
              trend.direction === "flat" && "bg-surface-muted text-ink-muted",
            )}
          >
            {trend.direction === "flat" ? (
              "No change"
            ) : (
              <>
                <Icon name={trend.direction === "up" ? "arrowUp" : "arrowDown"} className="mr-0.5 h-3 w-3" />
                {trend.direction}
              </>
            )}
          </span>
          {trend.text}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "brand";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-surface-muted text-ink-muted",
        tone === "success" && "bg-success-soft text-success",
        tone === "warning" && "bg-warning-soft text-warning",
        tone === "danger" && "bg-danger-soft text-danger",
        tone === "brand" && "bg-brand/10 text-brand",
      )}
    >
      {children}
    </span>
  );
}

// Body text stays ink for easy reading; the title carries the status colour.
export function Callout({ tone = "warning", title, children }: { tone?: "warning" | "danger" | "success" | "neutral"; title?: ReactNode; children: ReactNode }) {
  return (
    <div
      role={tone === "warning" || tone === "danger" ? "alert" : undefined}
      className={cx(
        "rounded-xl border px-5 py-4 text-sm text-ink",
        tone === "warning" && "border-warning-line bg-warning-soft",
        tone === "danger" && "border-danger-line bg-danger-soft",
        tone === "success" && "border-success-line bg-success-soft",
        tone === "neutral" && "border-line bg-surface-muted",
      )}
    >
      {title && (
        <p
          className={cx(
            "mb-1 font-semibold",
            tone === "warning" && "text-warning",
            tone === "danger" && "text-danger",
            tone === "success" && "text-success",
          )}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// A short status line with its icon ("Saved", "Card linked"); boxed adds the soft background
export function Notice({ tone, boxed, className, children }: { tone: "success" | "warning" | "danger"; boxed?: boolean; className?: string; children: ReactNode }) {
  return (
    <p
      role={tone === "success" ? "status" : undefined}
      className={cx(
        "flex items-start gap-2 text-sm",
        tone === "success" && "text-success",
        tone === "warning" && "text-warning",
        tone === "danger" && "text-danger",
        boxed && "rounded-md p-3",
        boxed && tone === "success" && "bg-success-soft",
        boxed && tone === "warning" && "bg-warning-soft",
        boxed && tone === "danger" && "bg-danger-soft",
        className,
      )}
    >
      <Icon name={tone === "success" ? "check" : "alert"} className="mt-[3px] h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

// A grey block standing in for content that is still loading
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-md bg-line/70 motion-reduce:animate-none", className)} />;
}

// Suspense fallback shaped like the page that's coming, instead of a "Loading…" line.
// list: title + rows; overview: title + stat strip + two panels; form: title + fields;
// fields: fields only (the page title is already showing); client: a client page card.
export function PageSkeleton({ variant = "list", className }: { variant?: "list" | "overview" | "form" | "fields" | "client"; className?: string }) {
  const title = (
    <>
      <Skeleton className="h-8 w-60 max-w-full" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
    </>
  );
  const rows = (n: number) => (
    <div className="divide-y divide-line">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-3">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
  const fields = (n: number) => (
    <div className="space-y-5">
      {Array.from({ length: n }, (_, i) => (
        <div key={i}>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
      ))}
    </div>
  );
  return (
    <div role="status" aria-label="Loading" className={className}>
      {variant === "list" && (
        <>
          {title}
          <div className="mt-8 rounded-xl border border-line bg-surface px-5 py-2">{rows(5)}</div>
        </>
      )}
      {variant === "overview" && (
        <>
          {title}
          <Skeleton className="mt-8 h-32 w-full rounded-xl" />
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface px-5 py-2">{rows(3)}</div>
            <div className="rounded-xl border border-line bg-surface px-5 py-2">{rows(5)}</div>
          </div>
        </>
      )}
      {variant === "form" && (
        <>
          {title}
          <div className="mt-8 rounded-xl border border-line bg-surface p-5">{fields(3)}</div>
        </>
      )}
      {variant === "fields" && fields(2)}
      {variant === "client" && (
        <div className="flex flex-col items-center">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="mt-4 h-6 w-48" />
          <Skeleton className="mt-6 h-40 w-full" />
          <Skeleton className="mt-4 h-10 w-full" />
        </div>
      )}
    </div>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
      <p>{children}</p>
      {action && (
        <Link href={action.href} className={cx(buttonClass("secondary", "sm"), "mt-3")}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

// A tidy list row: main text on the left, details on the right
export function Row({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
      <span className="min-w-0 text-ink">{children}</span>
      {aside && <span className="text-ink-muted tabular-nums">{aside}</span>}
    </li>
  );
}
