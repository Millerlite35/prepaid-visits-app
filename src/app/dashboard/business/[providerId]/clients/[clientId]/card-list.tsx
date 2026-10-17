"use client";

import { useActionState } from "react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import type { PassActionState } from "../actions";

type Action = (prev: PassActionState) => Promise<PassActionState>;
type Card = { id: string; linkedAt: string; cancel: Action };

function CancelCard({ cancel, linkedAt }: { cancel: Action; linkedAt: string }) {
  const [state, action, pending] = useActionState(cancel, {});
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2">
      <span>QR card, linked {linkedAt}</span>
      <form action={action}>
        <ConfirmSubmit
          label="Cancel card"
          question="It stops working straight away. Continue?"
          confirmLabel="Yes, cancel it"
          pending={pending}
          pendingLabel="Cancelling…"
          className="text-sm underline"
        />
      </form>
      {state.error && <p role="alert" className="w-full text-sm text-red-600">{state.error}</p>}
    </li>
  );
}

export function CardList({ cards }: { cards: Card[] }) {
  return (
    <>
      {cards.length === 0 ? (
        <p className="text-sm text-ink-muted">No QR cards.</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {cards.map((c) => (
            <CancelCard key={c.id} cancel={c.cancel} linkedAt={c.linkedAt} />
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-ink-muted">
        To give them a card: scan a new, unused card on the Scan page and choose this client. Lost card? Cancel it here,
        then link a new one.
      </p>
    </>
  );
}
