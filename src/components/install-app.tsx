"use client";

import { useEffect, useState } from "react";

// "Install the app" card. Android/Chrome/Edge offer a one-click install (the browser's
// beforeinstallprompt event); iPhone/iPad don't, so we show the two taps instead.
// Hidden once installed (opened from the home screen) or after "Not now".

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "install-card-dismissed";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isApple(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function InstallApp({ appName }: { appName: string }) {
  const [view, setView] = useState<"hidden" | "button" | "apple">("hidden");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // storage blocked: just show the card
    }
    if (dismissed || isStandalone()) return;
    // decided after the page loads, so the server and browser render the same thing
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only facts once on mount
    if (isApple()) setView("apple");

    const onPrompt = (e: Event) => {
      e.preventDefault(); // we show our own button instead of the browser's mini bar
      setPrompt(e as InstallPrompt);
      setView("button");
    };
    const onInstalled = () => setView("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // fine: it just shows again next time
    }
    setView("hidden");
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === "accepted") setView("hidden");
  }

  if (view === "hidden") return null;

  return (
    <section className="mt-8 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      <h2 className="font-medium">Install the {appName} app</h2>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
        Put it on your home screen: one tap to open, full screen, no browser bar. Handy for scanning at the front desk.
      </p>
      {view === "button" ? (
        <button onClick={install} className="mt-3 rounded-md bg-brand px-4 py-2 font-medium text-white">
          Install app
        </button>
      ) : (
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          <li>
            In Safari, tap the <strong>Share</strong> button{" "}
            <span aria-hidden className="inline-block rounded border border-zinc-300 px-1 dark:border-zinc-700">
              ⬆
            </span>
            .
          </li>
          <li>
            Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
          </li>
        </ol>
      )}
      <button onClick={dismiss} className="mt-3 block text-zinc-500 underline">
        Not now
      </button>
    </section>
  );
}
