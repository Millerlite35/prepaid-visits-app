import type { ReactNode } from "react";
import { Wordmark } from "@/components/wordmark";

// Sign-in, sign-up, password and two-step pages: the app's mark above a centred card
// on the soft dashboard background.
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center bg-canvas px-4 text-ink">
      <p className="mt-10 text-3xl">
        <Wordmark />
      </p>
      <div className="mt-6 mb-12 w-full max-w-md rounded-xl border border-line bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_-12px_rgba(0,0,0,0.12)] [&>main]:py-8 sm:[&>main]:px-8">
        {children}
      </div>
    </div>
  );
}
