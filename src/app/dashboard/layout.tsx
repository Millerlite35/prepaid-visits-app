import Link from "next/link";
import { brand } from "@/config/brand";
import { Icon } from "@/components/icons";
import { installableApp } from "@/lib/app-metadata";

export const metadata = installableApp;

// The bar on every dashboard page: our brand (back to the dashboard), Security and Help,
// over the soft "canvas" background the dashboard cards sit on.
// Static on purpose: no login reads here, so it never slows the page down.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const link = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-ink-muted transition hover:bg-surface-muted hover:text-ink";
  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur print:hidden">
        <nav className="flex h-14 w-full items-center justify-between px-4 text-sm sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight text-ink">
            {/* the app icon, drawn from the brand colours (src/app/icon.tsx) */}
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny generated icon */}
            <img src="/icon" alt="" width={24} height={24} className="rounded-md" />
            {brand.name}
          </Link>
          <span className="flex items-center gap-1">
            <Link href="/dashboard/security" className={link}>
              <Icon name="security" className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </Link>
            <Link href="/dashboard/help" className={link}>
              <Icon name="help" className="h-4 w-4" />
              <span className="hidden sm:inline">Help</span>
            </Link>
          </span>
        </nav>
      </header>
      {children}
    </div>
  );
}
