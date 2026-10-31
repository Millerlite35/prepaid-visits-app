import { brand, wordmarkParts } from "@/config/brand";
import { cx } from "@/components/ui";

// The product logo, drawn as text from brand.ts (so renaming stays a one-file change):
// first word bold navy, second word regular green, set tight like logos/visitbundle-logo.svg.
// Colours come from --wordmark-1 / --wordmark-2 (globals.css), which switch for dark mode.
export function Wordmark({ className }: { className?: string }) {
  const [first, second] = wordmarkParts();
  return (
    <span className={cx("tracking-[-0.02em] whitespace-nowrap", className)} aria-label={brand.name}>
      <span className="font-semibold text-[var(--wordmark-1)]">{first}</span>
      <span className="font-normal text-[var(--wordmark-2)]">{second}</span>
    </span>
  );
}
