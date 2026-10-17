import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: `Sign in · ${brand.name}` };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold text-brand">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-500">For providers and their staff.</p>
      <AuthForm mode="signin" />
      <p className="mt-4 text-sm">
        <Link href="/forgot-password" className="underline">
          Forgot password?
        </Link>
      </p>
      <p className="mt-2 text-sm">
        New here?{" "}
        <Link href="/signup" className="underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
