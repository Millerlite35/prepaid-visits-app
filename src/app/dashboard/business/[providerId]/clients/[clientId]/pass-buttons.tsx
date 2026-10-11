"use client";

import { useActionState } from "react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import type { PassActionState } from "../actions";

type Action = (prev: PassActionState) => Promise<PassActionState>;

function Result({ state }: { state: PassActionState }) {
  if (state.error) return <p role="alert" className="mt-2 text-sm text-red-600">{state.error}</p>;
  if (state.message) return <p role="status" className="mt-2 text-sm text-green-700 dark:text-green-500">✓ {state.message}</p>;
  return null;
}

export function PassButtons({ resend, reissue, hasPass }: { resend: Action; reissue: Action; hasPass: boolean }) {
  const [resendState, resendAction, resending] = useActionState(resend, {});
  const [reissueState, reissueAction, reissuing] = useActionState(reissue, {});

  return (
    <div className="space-y-4">
      <div>
        <form action={resendAction}>
          <button
            disabled={!hasPass || resending}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
          >
            {resending ? "Sending…" : "Resend pass email"}
          </button>
        </form>
        <p className="mt-1 text-xs text-zinc-500">For a client who can&apos;t find their email. Same pass, same code.</p>
        <Result state={resendState} />
      </div>

      <div>
        <form action={reissueAction}>
          <ConfirmSubmit
            label="Cancel pass and send a new one"
            question="The old code stops working straight away. Continue?"
            confirmLabel="Yes, cancel it"
            pending={reissuing}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-800 dark:text-red-400"
          />
        </form>
        <p className="mt-1 text-xs text-zinc-500">
          For a lost phone or a pass that was shared. Their balance stays the same.
        </p>
        <Result state={reissueState} />
      </div>
    </div>
  );
}
