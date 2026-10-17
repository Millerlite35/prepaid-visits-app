import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { requireUser } from "@/lib/auth";
import { requireEnv } from "@/lib/env";
import { NewBusinessForm } from "./new-business-form";

export const metadata: Metadata = { title: `Create your business · ${brand.name}` };

export default function NewBusinessPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Create your business</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This is the name clients see on your purchase page and visit cards.
      </p>
      <Suspense fallback={<p className="mt-6 text-sm">Loading…</p>}>
        <NewBusinessGate />
      </Suspense>
      <p className="mt-6 text-sm">
        <Link href="/dashboard" className="underline">
          Back to dashboard
        </Link>
      </p>
    </main>
  );
}

async function NewBusinessGate() {
  await requireUser();
  return <NewBusinessForm siteHost={new URL(requireEnv("SITE_URL")).host} />;
}
