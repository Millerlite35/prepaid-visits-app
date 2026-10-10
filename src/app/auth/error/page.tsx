import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold text-brand">That link didn&apos;t work</h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        It may have expired, already been used, or been opened in a different browser from
        the one you signed up in. If you just confirmed your email, your account is probably
        ready: try signing in.
      </p>
      <Link href="/login" className="mt-6 inline-block rounded-md bg-brand px-4 py-2 font-medium text-white">
        Go to sign in
      </Link>
    </main>
  );
}
