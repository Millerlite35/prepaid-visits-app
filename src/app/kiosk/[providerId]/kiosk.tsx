"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cameraErrorMessage, makeDetector } from "@/lib/qr-detector";
import type { KioskResult } from "./actions";

type Props = {
  checkIn: (code: string) => Promise<KioskResult>;
  exitHref: string;
  name: string;
  color: string;
  logo: string | null;
  singular: string;
  plural: string;
};

// How long a result stays on screen before going back to "Scan your pass".
const SHOW_MS = { good: 5000, problem: 8000 };

// Two ways to read the client's pass:
// - a USB desk scanner, which acts like a keyboard: it "types" the code very fast and
//   presses Enter. We listen to the whole page (no text box to keep focused), so a stray
//   click can't break it. Keys more than a second apart start a fresh code.
// - this computer's or tablet's own camera (front-facing), for offices without a scanner.
// The keyboard/paste listener stays on in camera mode too.
export function Kiosk({ checkIn, exitHref, name, color, logo, singular, plural }: Props) {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<"scanner" | "camera">("scanner");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCameraCodeRef = useRef({ code: "", at: 0 });
  const [result, setResult] = useState<KioskResult | "checking" | null>(null);
  const [askExit, setAskExit] = useState(false);
  const bufferRef = useRef({ text: "", at: 0 });
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const unit = (n: number) => (n === 1 ? singular : plural);

  const submit = useCallback(
    async (code: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      setResult("checking");
      let r: KioskResult;
      try {
        r = await checkIn(code);
      } catch {
        r = { result: "error" };
      }
      busyRef.current = false;
      const good = r.result === "ok" || r.result === "already";
      setResult(r);
      beep(good, audioRef.current);
      timerRef.current = setTimeout(() => setResult(null), good ? SHOW_MS.good : SHOW_MS.problem);
    },
    [checkIn],
  );

  useEffect(() => {
    if (!started) return;
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const now = Date.now();
      const buf = bufferRef.current;
      if (now - buf.at > 1000) buf.text = "";
      buf.at = now;
      if (e.key === "Enter") {
        const code = buf.text.trim();
        buf.text = "";
        if (code.length >= 10) void submit(code);
        e.preventDefault();
      } else if (e.key.length === 1 && buf.text.length < 300) {
        buf.text += e.key;
      }
    }
    // pasting a code (or pass link) works too: handy for testing without a scanner
    function onPaste(e: ClipboardEvent) {
      const code = e.clipboardData?.getData("text").trim() ?? "";
      if (code.length >= 10 && code.length <= 300) void submit(code);
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [started, submit]);

  // keep the screen from going to sleep while the check-in screen is up
  useEffect(() => {
    if (!started) return;
    let lock: { release(): Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> } };
    const request = () =>
      nav.wakeLock
        ?.request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    void request();
    const onVisible = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [started]);

  // camera mode: show the picture and look for a QR code a few times a second
  useEffect(() => {
    if (!started || mode !== "camera" || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    let stopped = false;
    void (async () => {
      await video.play().catch(() => {});
      const detector = await makeDetector();
      const loop = async () => {
        if (stopped) return;
        if (!busyRef.current && video.readyState >= 2) {
          try {
            const code = (await detector.detect(video))[0]?.rawValue;
            const now = Date.now();
            const last = lastCameraCodeRef.current;
            // the client is still holding the same pass up: don't check it again
            if (code && !(last.code === code && now - last.at < 10_000)) {
              lastCameraCodeRef.current = { code, at: now };
              void submit(code);
            }
          } catch {
            // a frame that can't be read; try the next one
          }
        }
        setTimeout(loop, 250);
      };
      void loop();
    })();
    return () => {
      stopped = true;
    };
  }, [started, mode, submit]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  async function start(chosen: "scanner" | "camera") {
    try {
      audioRef.current ??= new AudioContext(); // browsers only allow sound after a click
    } catch {
      // sound is optional
    }
    setCameraError(null);
    if (chosen === "camera") {
      setStarting(true);
      try {
        // "user" = the camera facing the person at the screen (laptop webcam, tablet front camera)
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          // ask for a sharp picture: webcams often default to a low resolution that blurs QR codes
          video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch (e) {
        setStarting(false);
        setCameraError(cameraErrorMessage(e, "Couldn't start the camera."));
        return;
      }
      setStarting(false);
    }
    document.documentElement.requestFullscreen?.().catch(() => {});
    setMode(chosen);
    setStarted(true);
  }

  if (!started) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <h1 className="text-2xl font-semibold" style={{ color }}>
          Self check-in
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          For a computer or tablet at your front desk, with a USB QR scanner or its own camera. Clients show
          their pass and are checked in, with no one at the keyboard.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>Sign this computer in with a scan-only staff account if you can.</li>
          <li>Test one scan before clients arrive. You should hear a beep.</li>
          <li>Testing without a scanner? Copy a pass link, start, click the screen and paste (Ctrl+V).</li>
          <li>Clients see their first name and {plural} left, nothing else.</li>
        </ul>
        <button onClick={() => start("scanner")} className="mt-6 rounded-md px-4 py-3 text-lg font-medium text-white" style={{ backgroundColor: color }}>
          Start with a desk scanner
        </button>
        <button
          onClick={() => start("camera")}
          disabled={starting}
          className="mt-3 rounded-md border-2 px-4 py-3 text-lg font-medium disabled:opacity-60"
          style={{ borderColor: color, color }}
        >
          {starting ? "Starting camera…" : "Start with this device's camera"}
        </button>
        <p className="mt-2 text-xs text-zinc-500">
          Camera: for a laptop webcam or a tablet on a stand facing clients. They hold their phone up to it.
        </p>
        {cameraError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {cameraError}
          </p>
        )}
        <Link href={exitHref} className="mt-4 text-sm underline">
          Back to the scanner
        </Link>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center bg-white px-6 py-10 text-center text-zinc-900 select-none">
      <div className="absolute top-8 flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- provider-uploaded logo from storage */}
        {logo && <img src={logo} alt="" className="mb-2 max-h-20 max-w-[260px] object-contain" />}
        <p className="text-2xl font-semibold" style={{ color }}>
          {name}
        </p>
      </div>

      <div role="status" aria-live="polite" className="w-full max-w-2xl">
        {result === null && (
          <>
            <p className="text-5xl font-semibold">Welcome!</p>
            <p className="mt-6 text-2xl text-zinc-600">
              {mode === "camera"
                ? "Hold your pass QR code up to the camera to check in."
                : "Hold your pass QR code under the scanner to check in."}
            </p>
            {mode === "scanner" && (
              <p className="mt-10 text-6xl" aria-hidden>
                ⬇
              </p>
            )}
          </>
        )}
        {result === "checking" && <p className="text-4xl text-zinc-600">Checking…</p>}
        {result !== null && result !== "checking" && <Message r={result} unit={unit} plural={plural} />}
      </div>

      {mode === "camera" && (
        // mirrored, so moving the phone feels natural; reading the code isn't affected
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="Camera"
          className="mt-8 aspect-[4/3] w-full max-w-sm -scale-x-100 rounded-2xl bg-black object-cover"
        />
      )}

      <div className="absolute right-4 bottom-4 text-sm text-zinc-400">
        {askExit ? (
          <span className="flex items-center gap-3 rounded-md bg-zinc-100 p-2 text-zinc-700">
            Staff: leave self check-in?
            <Link href={exitHref} className="font-medium underline">
              Leave
            </Link>
            <button onClick={() => setAskExit(false)} className="underline">
              Stay
            </button>
          </span>
        ) : (
          <button onClick={() => setAskExit(true)} className="underline">
            Staff
          </button>
        )}
      </div>
    </main>
  );
}

function Message({ r, unit, plural }: { r: KioskResult; unit: (n: number) => string; plural: string }) {
  switch (r.result) {
    case "ok":
      return (
        <Good title={`Thanks${r.firstName ? `, ${r.firstName}` : ""}! You're checked in.`}>
          {r.remaining > 0 ? `${r.remaining} ${unit(r.remaining)} left` : `That was your last one. Ask at the desk about a new package.`}
        </Good>
      );
    case "already":
      return <Good title={`You're already checked in${r.firstName ? `, ${r.firstName}` : ""}.`}>Please take a seat.</Good>;
    case "no_visits":
      return <SeeDesk title={`Your package has no ${plural} left.`} />;
    case "expired":
      return <SeeDesk title="This package has expired." />;
    case "not_recognised":
      return <SeeDesk title="We couldn't use that pass here." />;
    default:
      return <SeeDesk title="Something went wrong." line="Please try again, or see the front desk." />;
  }
}

function Good({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-green-50 px-6 py-10 text-green-900">
      <p className="text-7xl" aria-hidden>
        ✓
      </p>
      <p className="mt-4 text-4xl font-semibold">{title}</p>
      <p className="mt-4 text-2xl">{children}</p>
    </div>
  );
}

function SeeDesk({ title, line = "Please see the front desk." }: { title: string; line?: string }) {
  return (
    <div className="rounded-2xl bg-amber-50 px-6 py-10 text-amber-950">
      <p className="text-7xl" aria-hidden>
        !
      </p>
      <p className="mt-4 text-4xl font-semibold">{title}</p>
      <p className="mt-4 text-2xl">{line}</p>
    </div>
  );
}

function beep(good: boolean, audio: AudioContext | null) {
  if (!audio) return;
  try {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = good ? 880 : 220;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + (good ? 0.15 : 0.4));
  } catch {
    // sound is optional
  }
}
