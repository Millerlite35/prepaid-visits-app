"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui";
import { ACTIVITY_EVENT, IDLE_MINUTES, IDLE_WARNING_SECONDS } from "@/lib/idle";

const IDLE_MS = IDLE_MINUTES * 60_000;
const WARN_MS = IDLE_WARNING_SECONDS * 1000;
// shared by every open tab, so working in one tab keeps the others signed in too
const LAST_KEY = "idle.lastActivity";
const OUT_KEY = "idle.signedOut";
const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll", ACTIVITY_EVENT];

// Signs staff out after IDLE_MINUTES without any activity, with a one-minute warning first.
// Times are compared with the clock, so a laptop that slept past the limit signs out as soon
// as it wakes. Sessions also end on the server after 12 hours / 30 days (session-trust.ts).
export function IdleSignOut({ signOut }: { signOut: () => Promise<void> }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastRef = useRef(0);
  const leavingRef = useRef(false);
  // kept in refs so the timer below starts once per page load: re-renders (new props)
  // must never restart it, or a re-render would count as activity
  const signOutRef = useRef(signOut);
  const routerRef = useRef(router);
  useEffect(() => {
    signOutRef.current = signOut;
    routerRef.current = router;
  });

  const markActive = (force = false) => {
    const now = Date.now();
    if (!force && now - lastRef.current < 5000) return; // at most one write every 5 s
    lastRef.current = now;
    try {
      localStorage.setItem(LAST_KEY, String(now));
    } catch {
      // private window or storage blocked: this tab still keeps its own time
    }
  };

  useEffect(() => {
    lastRef.current = Date.now();
    markActive(true);

    const lastActivity = () => {
      try {
        const shared = Number(localStorage.getItem(LAST_KEY));
        return Number.isFinite(shared) && shared > lastRef.current ? shared : lastRef.current;
      } catch {
        return lastRef.current;
      }
    };

    const leave = async () => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      try {
        localStorage.setItem(OUT_KEY, String(Date.now())); // tells the other tabs
      } catch {}
      try {
        await signOutRef.current(); // redirects to /login?idle=1
      } catch {
        routerRef.current.replace("/login?idle=1");
      }
    };

    const tick = () => {
      const idle = Date.now() - lastActivity();
      if (idle >= IDLE_MS) void leave();
      else if (idle >= IDLE_MS - WARN_MS) setSecondsLeft(Math.ceil((IDLE_MS - idle) / 1000));
      else setSecondsLeft(null);
    };

    const onActivity = () => markActive();
    const onStorage = (e: StorageEvent) => {
      if (e.key === OUT_KEY && !leavingRef.current) {
        leavingRef.current = true;
        routerRef.current.replace("/login?idle=1"); // another tab already signed this browser out
      }
    };

    for (const name of ACTIVITY) window.addEventListener(name, onActivity, { passive: true });
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", tick);
    const timer = window.setInterval(tick, 1000);
    return () => {
      for (const name of ACTIVITY) window.removeEventListener(name, onActivity);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", tick);
      window.clearInterval(timer);
    };
  }, []);

  if (secondsLeft === null) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 print:hidden">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        aria-describedby="idle-body"
        className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-ink"
      >
        <h2 id="idle-title" className="font-display text-xl font-medium">
          Still there?
        </h2>
        <p id="idle-body" className="mt-2 text-sm text-ink-muted" aria-live="polite">
          For your clients&apos; privacy, you&apos;ll be signed out in {secondsLeft} second{secondsLeft === 1 ? "" : "s"}.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            autoFocus
            className={buttonClass("primary")}
            onClick={() => {
              markActive(true);
              setSecondsLeft(null);
            }}
          >
            Stay signed in
          </button>
          <button type="button" className={buttonClass("secondary")} onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
