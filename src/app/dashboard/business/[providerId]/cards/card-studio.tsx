"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { FontPicker, StylePicker, useRememberedFont, useRememberedStyle } from "@/components/style-picker";
import { resolveStyle, type DesignStyle } from "@/lib/design-styles";
import type { PrintableCard } from "@/lib/cards";
import type { CardsState } from "./actions";
import { CARD_H_IN, CARD_W_IN, QrCard, type CardBrand } from "./card-art";

type Mode = "avery" | "single";

// Avery 28371 / 8371 / 5371: 10 business cards (2 across, 5 down) on a US Letter sheet,
// 3/4 in side margins and 1/2 in top margin. Nudges fix small printer offsets.
const SHEET = { cols: 2, rows: 5, leftIn: 0.75, topIn: 0.5 };
const PER_SHEET = SHEET.cols * SHEET.rows;
const NUDGE_STEP_IN = 1 / 16;
const NUDGE_KEY = "card-nudge";

type Props = {
  brand: CardBrand;
  sampleQr: string;
  batchSizes: readonly number[];
  inStock: number;
  makeCards: (count: number) => Promise<CardsState>;
  reprintCards: () => Promise<CardsState>;
};

function useNudge() {
  const [nudge, setNudge] = useState({ x: 0, y: 0 });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(NUDGE_KEY) ?? "null");
      if (saved && Number.isInteger(saved.x) && Number.isInteger(saved.y)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser storage once on mount
        setNudge({ x: saved.x, y: saved.y });
      }
    } catch {
      // keep zero
    }
  }, []);
  function change(axis: "x" | "y", by: number) {
    setNudge((n) => {
      const next = { ...n, [axis]: Math.max(-16, Math.min(16, n[axis] + by)) };
      try {
        localStorage.setItem(NUDGE_KEY, JSON.stringify(next));
      } catch {
        // fine
      }
      return next;
    });
  }
  return [nudge, change] as const;
}

function Sheet({ cards, startSlot, nudge, b, s }: { cards: (PrintableCard | null)[]; startSlot: number; nudge: { x: number; y: number }; b: CardBrand; s: DesignStyle }) {
  return (
    <div className="card-sheet" style={{ width: "8.5in", height: "11in", position: "relative", background: "#ffffff", overflow: "hidden" }}>
      {cards.map((card, i) => {
        if (!card) return null;
        const slot = i;
        const col = slot % SHEET.cols;
        const row = Math.floor(slot / SHEET.cols);
        return (
          <div
            key={card.id}
            style={{
              position: "absolute",
              left: `${SHEET.leftIn + col * CARD_W_IN + nudge.x * NUDGE_STEP_IN}in`,
              top: `${SHEET.topIn + row * CARD_H_IN + nudge.y * NUDGE_STEP_IN}in`,
            }}
          >
            <QrCard b={b} qr={card.qrDataUrl} s={s} />
          </div>
        );
      })}
      {startSlot > 1 && <span className="sr-only">Starts at card position {startSlot}</span>}
    </div>
  );
}

// split cards into sheets of 10, leaving the first (startSlot - 1) positions empty
function toSheets(cards: PrintableCard[], startSlot: number): (PrintableCard | null)[][] {
  const slots: (PrintableCard | null)[] = [...Array(startSlot - 1).fill(null), ...cards];
  const sheets: (PrintableCard | null)[][] = [];
  for (let i = 0; i < slots.length; i += PER_SHEET) sheets.push(slots.slice(i, i + PER_SHEET));
  return sheets;
}

export function CardStudio({ brand, sampleQr, batchSizes, inStock, makeCards, reprintCards }: Props) {
  const [styleId, setStyleId] = useRememberedStyle("card-style");
  const [fontId, setFontId] = useRememberedFont("card-font");
  const [mode, setMode] = useState<Mode>("avery");
  const [count, setCount] = useState<number>(batchSizes[0]);
  const [startSlot, setStartSlot] = useState(1);
  const [nudge, changeNudge] = useNudge();
  const [state, setState] = useState<CardsState>({});
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the print area is added to <body> after the page loads
  useEffect(() => setMounted(true), []);

  const s = resolveStyle(styleId, fontId);
  const cards = state.cards ?? [];
  const sheets = mode === "avery" ? toSheets(cards, startSlot) : [];

  function run(action: () => Promise<CardsState>) {
    startTransition(async () => setState(await action()));
  }

  const printCss = `
@page { size: ${mode === "avery" ? "8.5in 11in" : `${CARD_W_IN}in ${CARD_H_IN}in`}; margin: 0; }
@media screen { #card-print-root { display: none; } }
@media print {
  body > *:not(#card-print-root) { display: none !important; }
  #card-print-root { display: block; }
  .card-sheet, .card-single { break-after: page; }
}`;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto]">
      <style>{printCss}</style>
      <div className="space-y-5">
        <StylePicker value={styleId} onChange={setStyleId} color={brand.color} />
        <FontPicker value={fontId} onChange={setFontId} />

        <fieldset>
          <legend className="text-sm font-medium">Print on</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["avery", "Avery 28371 sheet", "10 per Letter page (also 8371, 5371)"],
                ["single", "Card printer", "One card per page (3.5 × 2 in)"],
              ] as const
            ).map(([id, label, note]) => (
              <label
                key={id}
                className={`cursor-pointer rounded-md border p-2 text-sm ${mode === id ? "border-brand ring-1 ring-brand" : "border-line"}`}
              >
                <input type="radio" name="print-mode" className="sr-only" checked={mode === id} onChange={() => setMode(id)} />
                <span className="font-medium">{label}</span>
                <span className="block text-xs text-ink-muted">{note}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {mode === "avery" && (
          <div className="space-y-3 rounded-xl border border-line bg-surface p-4 text-sm">
            <label className="flex items-center gap-2">
              Start at card position
              <select
                value={startSlot}
                onChange={(e) => setStartSlot(Number(e.target.value))}
                className="rounded-md border border-line bg-surface px-2 py-1"
              >
                {Array.from({ length: PER_SHEET }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <span className="text-xs text-ink-muted">(for a half-used sheet: 1-2 top row, 9-10 bottom)</span>
            </label>
            <div>
              <p className="font-medium">Printer alignment</p>
              <p className="text-xs text-ink-muted">
                Each step is 1/16 in. Print a test on plain paper, hold it over a card sheet against a window, then nudge.
                Remembered on this computer.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span>
                  Left/right: {nudge.x > 0 ? "+" : ""}
                  {nudge.x}
                </span>
                <button type="button" onClick={() => changeNudge("x", -1)} className="rounded border px-2" aria-label="Move left">
                  ←
                </button>
                <button type="button" onClick={() => changeNudge("x", 1)} className="rounded border px-2" aria-label="Move right">
                  →
                </button>
                <span className="ml-3">
                  Up/down: {nudge.y > 0 ? "+" : ""}
                  {nudge.y}
                </span>
                <button type="button" onClick={() => changeNudge("y", -1)} className="rounded border px-2" aria-label="Move up">
                  ↑
                </button>
                <button type="button" onClick={() => changeNudge("y", 1)} className="rounded border px-2" aria-label="Move down">
                  ↓
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 rounded-xl border border-line bg-surface p-4 text-sm">
          <p className="font-medium">Cards to print</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-md border border-line bg-surface px-2 py-1.5"
            >
              {batchSizes.map((n) => (
                <option key={n} value={n}>
                  {n} new cards
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => makeCards(count))}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Working…" : "Make new cards"}
            </button>
          </div>
          {inStock > 0 && (
            <button type="button" disabled={pending} onClick={() => run(reprintCards)} className="underline disabled:opacity-60">
              Print my {inStock} unassigned card{inStock === 1 ? "" : "s"} again
            </button>
          )}
          {state.error && (
            <p role="alert" className="text-red-600">
              {state.error}
            </p>
          )}
          {cards.length > 0 && (
            <div className="space-y-2 rounded-md bg-green-50 p-3 text-green-900 dark:bg-green-950 dark:text-green-100">
              <p>
                {state.fresh ? "Made" : "Loaded"} {cards.length} card{cards.length === 1 ? "" : "s"}
                {mode === "avery" ? ` on ${sheets.length} sheet${sheets.length === 1 ? "" : "s"}` : ""}. Each has its own code.
              </p>
              <button type="button" onClick={() => window.print()} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90">
                Print or save as PDF
              </button>
              <p className="text-xs">
                In the print window: margins &quot;None&quot;, scale 100% (not &quot;Fit to page&quot;), and tick &quot;Background graphics&quot;.
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">{cards.length ? "First sheet" : "Preview"}</p>
        {cards.length && mode === "avery" ? (
          <div className="overflow-hidden rounded-md border border-line shadow-sm" style={{ width: 8.5 * 96 * 0.55, height: 11 * 96 * 0.55 }}>
            <div style={{ transform: "scale(0.55)", transformOrigin: "top left" }}>
              <Sheet cards={sheets[0]} startSlot={startSlot} nudge={nudge} b={brand} s={s} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-fit overflow-hidden rounded-md shadow-md ring-1 ring-zinc-200">
              <QrCard b={brand} qr={cards[0]?.qrDataUrl ?? sampleQr} s={s} />
            </div>
            <p className="max-w-[3.5in] text-xs text-ink-muted">
              Shown at real size. Only your business, the label and a QR code are printed: nothing about the client, so a lost
              card reveals nothing. Link a card to a client by scanning it the first time.
            </p>
          </div>
        )}
      </div>

      {mounted &&
        cards.length > 0 &&
        createPortal(
          <div id="card-print-root">
            {mode === "avery"
              ? sheets.map((sheet, i) => <Sheet key={i} cards={sheet} startSlot={startSlot} nudge={nudge} b={brand} s={s} />)
              : cards.map((card) => (
                  <div key={card.id} className="card-single">
                    <QrCard b={brand} qr={card.qrDataUrl} s={s} />
                  </div>
                ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
