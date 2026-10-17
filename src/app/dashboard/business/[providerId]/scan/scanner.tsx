"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cameraErrorMessage, makeDetector } from "@/lib/qr-detector";
import type { ScanResult, UndoResult } from "./actions";

type Props = {
  checkIn: (code: string, force: boolean) => Promise<ScanResult>;
  undo: (ledgerId: number) => Promise<UndoResult>;
  singular: string;
  plural: string;
};

// Short beep + buzz so staff know the result without looking closely.
function feedback(good: boolean, audio: AudioContext | null) {
  try {
    navigator.vibrate?.(good ? 80 : [80, 60, 80]);
  } catch {
    // vibration is optional
  }
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = good ? 880 : 220;
  gain.gain.value = 0.15;
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + (good ? 0.12 : 0.35));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function Scanner({ checkIn, undo, singular, plural }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const busyRef = useRef(false);
  const pausedRef = useRef(false);
  const lastRef = useRef({ code: "", at: 0 });

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<{ scan: ScanResult; code: string } | null>(null);
  const [undoState, setUndoState] = useState<UndoResult | "working" | null>(null);
  const [manual, setManual] = useState("");

  const unit = (n: number) => (n === 1 ? singular : plural);

  const handle = useCallback(
    async (code: string, force = false) => {
      if (busyRef.current) return;
      const now = Date.now();
      if (!force && lastRef.current.code === code && now - lastRef.current.at < 5000) return; // same code still in view
      busyRef.current = true;
      pausedRef.current = true;
      lastRef.current = { code, at: now };
      try {
        const scan = await checkIn(code, force);
        setResult({ scan, code });
        setUndoState(null);
        feedback(scan.result === "ok", audioRef.current);
      } catch {
        setResult({ scan: { result: "error" }, code });
        feedback(false, audioRef.current);
      } finally {
        busyRef.current = false;
      }
    },
    [checkIn],
  );

  function unlockAudio() {
    try {
      audioRef.current ??= new AudioContext();
    } catch {
      // sound is optional
    }
  }

  async function startCamera() {
    unlockAudio();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setCameraOn(true);
      const detector = await makeDetector();
      const loop = async () => {
        if (!streamRef.current) return;
        if (!pausedRef.current && !busyRef.current && video.readyState >= 2) {
          try {
            const codes = await detector.detect(video);
            if (codes[0]?.rawValue) void handle(codes[0].rawValue);
          } catch {
            // a frame that can't be read; try the next one
          }
        }
        setTimeout(loop, 200);
      };
      void loop();
    } catch (e) {
      stopCamera();
      setCameraError(
        window.isSecureContext
          ? `${cameraErrorMessage(e, "Couldn't start the camera.")} You can use a USB scanner or type the code below.`
          : "The camera only works on a secure (https) address. Use the box below for now.",
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  function next() {
    setResult(null);
    setUndoState(null);
    pausedRef.current = false;
  }

  async function doUndo(ledgerId: number) {
    setUndoState("working");
    setUndoState(await undo(ledgerId));
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "1 / 1" }}>
        <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${cameraOn ? "" : "hidden"}`} />
        {!cameraOn && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <button onClick={startCamera} className="rounded-lg bg-white px-5 py-3 font-medium text-black">
              Start camera
            </button>
            {cameraError && <p className="text-sm text-zinc-300">{cameraError}</p>}
          </div>
        )}
        {cameraOn && !result && (
          <div className="pointer-events-none absolute inset-10 rounded-xl border-4 border-white/70" aria-hidden />
        )}
        {result && <ResultCard result={result} unit={unit} undoState={undoState} onUndo={doUndo} onForce={() => handle(result.code, true)} onNext={next} />}
      </div>

      {cameraOn && (
        <button onClick={stopCamera} className="text-sm underline">
          Stop camera
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          unlockAudio();
          if (manual.trim()) void handle(manual.trim());
          setManual("");
        }}
        className="space-y-2"
      >
        <label className="block">
          <span className="text-sm font-medium">USB scanner or type the code</span>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Click here, then scan with a USB scanner"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700">Check in</button>
      </form>
    </div>
  );
}

function ResultCard({
  result,
  unit,
  undoState,
  onUndo,
  onForce,
  onNext,
}: {
  result: { scan: ScanResult; code: string };
  unit: (n: number) => string;
  undoState: UndoResult | "working" | null;
  onUndo: (ledgerId: number) => void;
  onForce: () => void;
  onNext: () => void;
}) {
  const s = result.scan;
  const tone =
    s.result === "ok" ? "bg-green-600" : s.result === "duplicate_recent" || s.result === "unassigned" ? "bg-amber-500" : "bg-red-600";

  let title = "";
  let detail: ReactNode = null;
  switch (s.result) {
    case "ok":
      title = "✓ Checked in";
      detail = (
        <>
          <p className="text-2xl font-semibold">{s.clientName}</p>
          <p className="mt-1">
            {s.remaining} {unit(s.remaining)} left{s.nextExpiry ? ` · next expiry ${formatDate(s.nextExpiry)}` : ""}
          </p>
        </>
      );
      break;
    case "duplicate_recent":
      title = "Already checked in";
      detail = (
        <>
          <p className="text-xl font-semibold">{s.clientName}</p>
          <p className="mt-1">Checked in a moment ago. {s.remaining} {unit(s.remaining)} left.</p>
        </>
      );
      break;
    case "no_visits":
      title = `✗ No ${unit(2)} left`;
      detail = <p className="text-xl font-semibold">{s.clientName}</p>;
      break;
    case "expired":
      title = "✗ Package expired";
      detail = <p className="text-xl font-semibold">{s.clientName}</p>;
      break;
    case "revoked":
      title = "✗ Pass cancelled";
      detail = <p>This pass was cancelled. The client needs a new one.</p>;
      break;
    case "unassigned":
      title = "New card";
      detail = <p>This card isn&apos;t linked to a client yet.</p>;
      break;
    case "unknown_code":
      title = "✗ Code not recognised";
      detail = <p>This isn&apos;t a pass for this business.</p>;
      break;
    default:
      title = "Something went wrong";
      detail = <p>Please try again.</p>;
  }

  return (
    <div className={`absolute inset-0 flex flex-col justify-between p-6 text-white ${tone}`} role="status" aria-live="assertive">
      <div>
        <p className="text-3xl font-bold">{title}</p>
        <div className="mt-4">{detail}</div>
        {s.result === "ok" && (
          <div className="mt-4 text-sm">
            {undoState === null && (
              <button onClick={() => onUndo(s.ledgerId)} className="underline">
                Undo this check-in
              </button>
            )}
            {undoState === "working" && <p>Undoing…</p>}
            {undoState && undoState !== "working" &&
              (undoState.ok ? (
                <p className="font-medium">Undone. {undoState.remaining} {unit(undoState.remaining)} left.</p>
              ) : (
                <p className="font-medium">{undoState.error}</p>
              ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {s.result === "duplicate_recent" && (
          <button onClick={onForce} className="rounded-lg border-2 border-white px-4 py-3 font-medium">
            Check in again anyway
          </button>
        )}
        <button onClick={onNext} className="rounded-lg bg-white px-5 py-3 font-semibold text-black">
          Scan next
        </button>
      </div>
    </div>
  );
}
