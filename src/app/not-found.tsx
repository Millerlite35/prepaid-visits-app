import Link from "next/link";
import { buttonClass } from "@/components/ui";

// Wrong address, or a private purchase page without its key (the two look the same on purpose)
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-ink-muted">Check the link, or ask whoever sent it for a new one.</p>
      <div className="mt-6 flex justify-center">
        <Link href="/dashboard" className={buttonClass("secondary")}>
          Staff sign-in
        </Link>
      </div>
    </main>
  );
}
