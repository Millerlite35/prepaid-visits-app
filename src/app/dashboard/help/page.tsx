import { Suspense } from "react";
import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { helpFaq, supportTopics } from "@/config/help-faq";
import { requireUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendSupportRequest } from "./actions";
import { FaqList, SupportForm } from "./help-forms";

export const metadata: Metadata = { title: `Help · ${brand.name}` };

export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold text-brand">Help</h1>
      <p className="mt-1 text-sm text-zinc-500">Answers to common questions, and a way to reach us.</p>

      <div className="mt-6">
        <FaqList topics={helpFaq} />
      </div>

      <section id="contact" className="mt-10 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-medium">Contact support</h2>
        <p className="mb-4 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Didn&apos;t find your answer? Send us a message and we&apos;ll reply by email.
        </p>
        <Suspense fallback={<p className="text-sm">Loading…</p>}>
          <SupportSection />
        </Suspense>
      </section>
    </main>
  );
}

const TOPIC_LABEL = Object.fromEntries(supportTopics.map((t) => [t.value, t.label]));

async function SupportSection() {
  const user = await requireUser();
  const db = getAdminClient();
  const [{ data: memberships }, { data: recent }] = await Promise.all([
    db
      .from("provider_members")
      .select("providers(id, display_name)")
      .eq("user_id", user.id)
      .returns<{ providers: { id: string; display_name: string } | null }[]>(),
    db
      .from("support_requests")
      .select("id, topic, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<{ id: string; topic: string; status: string; created_at: string }[]>(),
  ]);
  const businesses = (memberships ?? [])
    .map((m) => m.providers)
    .filter((p): p is { id: string; display_name: string } => !!p)
    .map((p) => ({ id: p.id, name: p.display_name }));

  return (
    <>
      <SupportForm action={sendSupportRequest} topics={supportTopics} businesses={businesses} />
      {recent && recent.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium">Your recent messages</h3>
          <ul className="mt-2 divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            {recent.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 py-2">
                <span>{TOPIC_LABEL[r.topic] ?? r.topic}</span>
                <span className="text-zinc-500">
                  {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ·{" "}
                  {r.status === "open" ? "Received" : r.status === "answered" ? "Answered" : "Closed"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
