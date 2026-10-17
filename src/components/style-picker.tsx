"use client";

import { useEffect, useState } from "react";
import {
  DESIGN_FONT_IDS,
  DESIGN_FONTS,
  DESIGN_STYLE_IDS,
  DESIGN_STYLES,
  isDesignFont,
  isDesignStyle,
  type DesignFontId,
  type DesignStyleId,
} from "@/lib/design-styles";

// Picks a design style and remembers it in this browser (a convenience only: nothing is
// saved on the server), so the next print uses the same look.
function useRemembered<T extends string>(key: string, fallback: T, valid: (v: unknown) => v is T) {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser storage once on mount
      if (valid(saved)) setValue(saved);
    } catch {
      // storage blocked: keep the default
    }
  }, [key, valid]);
  function choose(next: T) {
    setValue(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // fine: it just won't be remembered
    }
  }
  return [value, choose] as const;
}

export function useRememberedStyle(key: string) {
  return useRemembered<DesignStyleId>(key, "professional", isDesignStyle);
}

export function useRememberedFont(key: string) {
  return useRemembered<DesignFontId>(key, "style", isDesignFont);
}

export function FontPicker({ value, onChange }: { value: DesignFontId; onChange: (f: DesignFontId) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">Heading font</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {DESIGN_FONT_IDS.map((id) => {
          const f = DESIGN_FONTS[id];
          return (
            <label
              key={id}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${value === id ? "border-brand ring-1 ring-brand" : "border-zinc-300 dark:border-zinc-700"}`}
              style={f.family ? { fontFamily: f.family } : undefined}
            >
              <input type="radio" name="design-font" className="sr-only" checked={value === id} onChange={() => onChange(id)} />
              {f.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function StylePicker({ value, onChange, color }: { value: DesignStyleId; onChange: (s: DesignStyleId) => void; color: string }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">Design style</legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {DESIGN_STYLE_IDS.map((id) => {
          const s = DESIGN_STYLES[id];
          return (
            <label
              key={id}
              className={`cursor-pointer rounded-md border p-2 text-sm ${value === id ? "border-brand ring-1 ring-brand" : "border-zinc-300 dark:border-zinc-700"}`}
            >
              <input type="radio" name="design-style" className="sr-only" checked={value === id} onChange={() => onChange(id)} />
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-4 w-4 rounded-sm border border-zinc-300"
                  style={{ background: s.pageBg, boxShadow: `inset 4px 0 0 ${s.stripe(color)}` }}
                />
                <span className="font-medium" style={{ fontFamily: s.headingFont }}>
                  {s.label}
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">{s.note}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
