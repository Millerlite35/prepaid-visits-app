"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

// Top-bar account button: who's signed in, Security, Sign out. Closes on Escape or a click outside.
export function AccountMenu({ email, signOut }: { email: string; signOut: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account"
        className="inline-flex items-center rounded-md px-2.5 py-1.5 text-ink-muted transition hover:bg-surface-muted hover:text-ink"
      >
        <Icon name="staff" className="h-5 w-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 w-64 rounded-md border border-line bg-surface py-1 text-sm shadow-sm">
          <p className="truncate px-3 py-2 text-ink-muted">{email}</p>
          <Link href="/dashboard/security" role="menuitem" onClick={() => setOpen(false)} className="block px-3 py-2 text-ink hover:bg-surface-muted">
            Security
          </Link>
          <form action={signOut}>
            <button role="menuitem" className="block w-full px-3 py-2 text-left text-ink hover:bg-surface-muted">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
