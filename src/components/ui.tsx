import type { ReactNode } from "react";
import Link from "next/link";

// Shared building blocks for the staff dashboard, so every page has the same look.
// Colours come from the tokens in globals.css (canvas, surface, line, ink) plus the
// provider/brand colour; no product name or brand colour is hardcoded here.

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-sm hover:opacity-90",
  secondary: "border border-line bg-surface text-ink shadow-sm hover:bg-surface-muted",
  ghost: "text-ink hover:bg-surface-muted",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
};

// For <button>, <a> and <Link>: buttonClass("primary")
export function buttonClass(variant: ButtonVariant = "primary", size: "sm" | "md" = "md"): string {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
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
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
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
    <section className={cx("rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="font-semibold text-ink">{title}</h2>}
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

export function Stat({ label, value, trend, hint }: { label: ReactNode; value: ReactNode; trend?: Trend; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {trend && (
        <p className="mt-1.5 text-xs text-ink-muted">
          <span
            className={cx(
              "mr-1 inline-flex items-center rounded-full px-1.5 py-0.5 font-medium",
              trend.direction === "up" && "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-400",
              trend.direction === "down" && "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
              trend.direction === "flat" && "bg-surface-muted text-ink-muted",
            )}
          >
            {trend.direction === "up" ? "▲ up" : trend.direction === "down" ? "▼ down" : "No change"}
          </span>
          {trend.text}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export type BadgeTone = "neutral" | "green" | "amber" | "red" | "brand";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-surface-muted text-ink-muted",
        tone === "green" && "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-400",
        tone === "amber" && "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        tone === "red" && "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
        tone === "brand" && "bg-brand/10 text-brand",
      )}
    >
      {children}
    </span>
  );
}

export function Callout({ tone = "amber", title, children }: { tone?: "amber" | "red" | "green" | "neutral"; title?: ReactNode; children: ReactNode }) {
  return (
    <div
      role={tone === "amber" || tone === "red" ? "alert" : undefined}
      className={cx(
        "rounded-xl border px-5 py-4 text-sm",
        tone === "amber" && "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
        tone === "red" && "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100",
        tone === "green" && "border-green-300 bg-green-50 text-green-950 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100",
        tone === "neutral" && "border-line bg-surface-muted text-ink",
      )}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
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
