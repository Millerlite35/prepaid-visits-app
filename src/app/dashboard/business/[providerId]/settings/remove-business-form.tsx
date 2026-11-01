"use client";

import { useActionState, useState } from "react";
import { buttonClass } from "@/components/ui";
import type { RemoveState } from "./remove-actions";

type Props = {
  action: (prev: RemoveState, formData: FormData) => Promise<RemoveState>;
  name: string;
  hasSales: boolean;
  plural: string;
};

// The "type the name to confirm" step for deleting or closing a business
export function RemoveBusinessForm({ action, name, hasSales, plural }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === name.trim().toLowerCase();

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="mode" value={hasSales ? "close" : "delete"} />
      {hasSales ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
          <li>The purchase page stops selling and old links stop working.</li>
          <li>Every client pass and QR card is cancelled, so check-ins stop.</li>
          <li>
            Purchases, refunds and {plural} history are kept (you may need them for taxes, refunds or disputes). No
            refunds are made automatically: refund clients from their page first if you want to.
          </li>
          <li>It leaves your dashboard list. This can&apos;t be undone.</li>
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">
          It has never sold anything, so it&apos;s deleted completely: packages, staff, printed QR cards and settings.
          This can&apos;t be undone.
        </p>
      )}
      <label className="block text-sm">
        <span className="font-medium">
          Type <span className="font-semibold">{name}</span> to confirm
        </span>
        <input
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="mt-1 block w-full max-w-sm rounded-md border border-line bg-surface px-3 py-2"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button disabled={!matches || pending} className={buttonClass("danger")}>
        {pending ? "Working…" : hasSales ? "Close this business" : "Delete this business"}
      </button>
    </form>
  );
}
