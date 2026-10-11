import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { brand } from "@/config/brand";
import { requireOwner } from "@/lib/auth";
import { ROLE_HELP, ROLE_LABELS } from "@/lib/staff";
import { getAdminClient } from "@/lib/supabase/admin";
import { cancelInvite, changeRole, inviteStaff, removeMember } from "./actions";
import { InviteForm } from "./staff-forms";

export const metadata: Metadata = { title: `Staff · ${brand.name}` };

export default function StaffPage({ params }: PageProps<"/dashboard/business/[providerId]/staff">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <StaffContent params={params} />
      </Suspense>
    </main>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function StaffContent({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  const me = await requireOwner(providerId);

  // Members' emails live in Supabase Auth, so the server reads them after the owner check.
  const db = getAdminClient();
  const [{ data: provider }, { data: members }, { data: invites }] = await Promise.all([
    db.from("providers").select("display_name").eq("id", providerId).single<{ display_name: string }>(),
    db
      .from("provider_members")
      .select("user_id, role, created_at")
      .eq("provider_id", providerId)
      .order("created_at")
      .returns<{ user_id: string; role: string; created_at: string }[]>(),
    db
      .from("staff_invites")
      .select("id, email, role, created_at, expires_at")
      .eq("provider_id", providerId)
      .is("accepted_at", null)
      .is("cancelled_at", null)
      .order("created_at", { ascending: false })
      .returns<{ id: string; email: string; role: string; created_at: string; expires_at: string }[]>(),
  ]);
  const people = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await db.auth.admin.getUserById(m.user_id);
      return { ...m, email: data.user?.email ?? "(unknown)" };
    }),
  );
  const openInvites = (invites ?? []).filter((i) => new Date(i.expires_at) > new Date());
  const card = "mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";

  return (
    <>
      <Link href="/dashboard" className="text-sm underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-brand">Staff</h1>
      <p className="mt-1 text-sm text-zinc-500">{provider?.display_name}</p>

      <section className={card}>
        <h2 className="mb-3 font-medium">People with access</h2>
        <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          {people.map((p) => (
            <li key={p.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span>
                <span className="font-medium">{p.email}</span>
                {p.user_id === me.id && <span className="text-zinc-500"> (you)</span>}
                <span className="block text-xs text-zinc-500">
                  {ROLE_LABELS[p.role] ?? p.role} · since {fmt(p.created_at)}
                </span>
              </span>
              {p.role !== "owner" && (
                <span className="flex flex-wrap items-center gap-3">
                  <form action={changeRole.bind(null, providerId, p.user_id)} className="flex items-center gap-2">
                    <select name="role" defaultValue={p.role} className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                      <option value="scan_only">Front desk (scan only)</option>
                      <option value="manager">Manager</option>
                    </select>
                    <button className="text-sm underline">Change</button>
                  </form>
                  <form action={removeMember.bind(null, providerId, p.user_id)}>
                    <ConfirmSubmit
                      label="Remove"
                      question={`Remove ${p.email}? They lose access straight away.`}
                      confirmLabel="Yes, remove"
                      className="text-sm text-red-600 underline"
                    />
                  </form>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {openInvites.length > 0 && (
        <section className={card}>
          <h2 className="mb-3 font-medium">Waiting to join</h2>
          <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            {openInvites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  <span className="font-medium">{i.email}</span>
                  <span className="block text-xs text-zinc-500">
                    {ROLE_LABELS[i.role] ?? i.role} · invited {fmt(i.created_at)} · expires {fmt(i.expires_at)}
                  </span>
                </span>
                <form action={cancelInvite.bind(null, providerId, i.id)}>
                  <button className="text-sm underline">Cancel invitation</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={card}>
        <h2 className="mb-3 font-medium">Invite someone</h2>
        <InviteForm action={inviteStaff.bind(null, providerId)} roleHelp={ROLE_HELP} />
      </section>
    </>
  );
}
