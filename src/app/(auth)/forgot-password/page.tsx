import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { ForgotPasswordForm } from "../password-forms";

export const metadata: Metadata = { title: `Reset password · ${brand.name}` };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold text-brand">Reset your password</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Enter the email you sign in with. We&apos;ll send you a link to choose a new password.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-sm">
        <Link href="/login" className="underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
