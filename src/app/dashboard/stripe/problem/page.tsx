import Link from "next/link";

export default function StripeProblemPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Couldn&apos;t reach Stripe</h1>
      <p className="mt-3 text-sm text-ink-muted">
        Something went wrong starting your Stripe setup. Nothing was charged. Please try
        again in a minute. If it keeps happening, contact support.
      </p>
      <Link href="/dashboard" className="mt-6 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90">
        Back to dashboard
      </Link>
    </main>
  );
}
