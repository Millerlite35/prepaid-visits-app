import { Suspense } from "react";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { Wordmark } from "@/components/wordmark";
import { Icon } from "@/components/icons";
import { installableApp } from "@/lib/app-metadata";
import { createSessionClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";

export const metadata = installableApp;

// The bar on every dashboard page: our brand (back to the dashboard), Help and the account
// menu (email, Security, Sign out), over the soft "canvas" background the panels sit on.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur print:hidden">
        <nav className="flex h-14 w-full items-center justify-between px-4 text-sm sm:px-6">
          <Link href="/dashboard" className="text-xl">
            <Wordmark />
          </Link>
          <span className="flex items-center gap-1">
            <Link
              href="/dashboard/help"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-ink-muted transition hover:bg-surface-muted hover:text-ink"
            >
              <Icon name="help" className="h-4 w-4" />
              <span className="hidden sm:inline">Help</span>
            </Link>
            <Suspense fallback={<span className="inline-block h-8 w-10" />}>
              <Account />
            </Suspense>
          </span>
        </nav>
      </header>
      {children}
    </div>
  );
}

// Only reads who's signed in (for the menu); each page still does its own access check
async function Account() {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "";
  if (!email) return null;
  return <AccountMenu email={email} signOut={signOut} />;
}
