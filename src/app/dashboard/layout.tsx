import Link from "next/link";
import { brand } from "@/config/brand";

// A slim bar on every dashboard page: our brand (back to the dashboard), Security and Help.
// Static on purpose: no login reads here, so it never slows the page down.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <>
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 text-sm">
          <Link href="/dashboard" className="font-semibold text-brand">
            {brand.name}
          </Link>
          <span className="flex gap-2">
            <Link href="/dashboard/security" className="rounded-md px-2 py-1 font-medium underline-offset-2 hover:underline">
              Security
            </Link>
            <Link href="/dashboard/help" className="rounded-md px-2 py-1 font-medium underline-offset-2 hover:underline">
              Help
            </Link>
          </span>
        </nav>
      </header>
      {children}
    </>
  );
}
