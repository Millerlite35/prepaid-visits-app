import type { ReactNode } from "react";
import { brand } from "@/config/brand";
import { logoUrl } from "@/lib/branding";

// The frame for client-facing pages (purchase, thank-you, pass): a soft background, a
// white card topped with the practice's colour, and the practice's contact in the footer.

export function ClientShell({ children, contact = [], width = "md" }: { children: ReactNode; contact?: string[]; width?: "sm" | "md" }) {
  return (
    <div className="flex flex-1 flex-col bg-canvas text-ink">
      <main className={`mx-auto w-full flex-1 px-4 py-8 sm:py-12 ${width === "sm" ? "max-w-sm" : "max-w-xl"}`}>
        {children}
        <footer className="mt-8 space-y-1 text-center text-xs text-ink-muted">
          {contact.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="pt-2 opacity-70">Powered by {brand.name}</p>
        </footer>
      </main>
    </div>
  );
}

export function ClientCard({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_-12px_rgba(0,0,0,0.12)]"
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div className="px-5 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  );
}

// Logo (or name) and a subtitle, centred
export function ClientHeader({ name, color, logoPath, subtitle }: { name: string; color: string; logoPath: string | null; subtitle?: ReactNode }) {
  const logo = logoUrl(logoPath);
  return (
    <header className="text-center">
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element -- provider-uploaded logo from storage
        <img src={logo} alt={`${name} logo`} className="mx-auto mb-3 max-h-20 max-w-[240px] object-contain" />
      )}
      <h1 className={logo ? "text-lg font-semibold text-ink" : "text-2xl font-semibold"} style={logo ? undefined : { color }}>
        {name}
      </h1>
      {subtitle && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{subtitle}</p>}
    </header>
  );
}
