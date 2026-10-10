import { Suspense } from "react";
import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { requireUser } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";

export const metadata: Metadata = { title: `Dashboard · ${brand.name}` };

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold text-brand">Dashboard</h1>
      <Suspense fallback={<p className="mt-4 text-sm">Loading…</p>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

type Membership = { role: string; providers: { display_name: string } | null };

async function DashboardContent() {
  const user = await requireUser();

  // Read as the signed-in person: row-level security limits this to their own businesses.
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("provider_members")
    .select("role, providers(display_name)")
    .returns<Membership[]>();

  return (
    <>
      <p className="mt-1 text-sm text-zinc-500">Signed in as {user.email}</p>

      <section className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-medium">Your businesses</h2>
        {error ? (
          <p className="mt-2 text-sm text-red-600">Couldn&apos;t load your businesses. Try refreshing.</p>
        ) : data.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            You&apos;re not part of a business yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {data.map((m, i) => (
              <li key={i}>
                {m.providers?.display_name ?? "A business"}{" "}
                <span className="text-zinc-500">({m.role.replace("_", " ")})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={signOut} className="mt-8">
        <button className="text-sm underline">Sign out</button>
      </form>
    </>
  );
}
