"use client";

import { useEffect, useMemo, useState } from "react";
import {
  defaultHeadline,
  defaultMessage,
  FLYER_LIMITS,
  MAX_FLYER_PACKAGES,
  type FlyerContent,
  type FlyerPackage,
} from "@/lib/flyer-content";
import { FontPicker, StylePicker, useRememberedFont, useRememberedStyle } from "@/components/style-picker";
import { Artwork, TEMPLATES, type PrintTemplate } from "./artwork";

type Template = PrintTemplate | "social";

type Props = {
  socialBase: string; // URL of the social image route
  businessName: string;
  color: string;
  logo: string | null;
  qrDataUrl: string;
  shortUrl: string;
  contact: string[];
  usualPriceCents: number | null;
  singular: string;
  plural: string;
  packages: FlyerPackage[];
};

const PREVIEW_WIDTH_PX = 520;

// The preview is shrunk on screen and printed at real size; when printing, only the
// artwork shows.
const PRINT_CSS = `.artwork-scale {
  transform: scale(var(--s, 1));
  transform-origin: top left;
}
@media print {
  body * {
    visibility: hidden;
  }
  #print-area,
  #print-area * {
    visibility: visible;
  }
  #print-area {
    position: absolute;
    left: 0;
    top: 0;
    transform: none !important;
  }
  .artwork-frame {
    border: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;
  }
}`;
const MIN_LOGO_WIDTH_PX = 500; // smaller logos look soft when printed

export function Studio(props: Props) {
  const [template, setTemplate] = useState<Template>("flyer");
  const [styleId, setStyleId] = useRememberedStyle("flyer-style");
  const [fontId, setFontId] = useRememberedFont("flyer-font");
  const [selected, setSelected] = useState<string[]>(props.packages.slice(0, MAX_FLYER_PACKAGES).map((p) => p.id));
  const [headline, setHeadline] = useState(defaultHeadline(props.plural));
  const [message, setMessage] = useState(defaultMessage(props.plural));
  const [usual, setUsual] = useState(props.usualPriceCents ? String(props.usualPriceCents / 100) : "");
  const [logoWidth, setLogoWidth] = useState<number | null>(null);

  // warn if the logo is too small to print sharply
  useEffect(() => {
    if (!props.logo) return;
    const img = new Image();
    img.onload = () => setLogoWidth(img.naturalWidth);
    img.src = props.logo;
  }, [props.logo]);

  const usualCents = /^\d{1,5}(\.\d{1,2})?$/.test(usual.trim()) ? Math.round(Number(usual) * 100) : null;
  const content: FlyerContent = {
    businessName: props.businessName,
    color: props.color,
    logo: props.logo,
    qrDataUrl: props.qrDataUrl,
    shortUrl: props.shortUrl,
    contact: props.contact,
    singular: props.singular,
    plural: props.plural,
    headline: headline.trim() || defaultHeadline(props.plural),
    message: message.trim(),
    packages: props.packages.filter((p) => selected.includes(p.id)),
    usualPriceCents: usualCents,
  };

  // the social image is drawn on the server; debounce so typing doesn't fire a request per key
  const socialUrl = useMemo(() => {
    const q = new URLSearchParams({ h: content.headline, m: content.message, p: selected.join(","), s: styleId });
    if (usualCents) q.set("u", String(usualCents));
    return `${props.socialBase}?${q.toString()}`;
  }, [content.headline, content.message, selected, usualCents, props.socialBase, styleId]);
  const [socialSrc, setSocialSrc] = useState(socialUrl);
  const [downloading, setDownloading] = useState<"idle" | "working" | "failed">("idle");
  // the social preview is drawn on the server: show progress, and retry once if it fails
  // (a browser won't re-request an image address that failed before)
  const [preview, setPreview] = useState<{ state: "loading" | "ready" | "failed"; attempt: number }>({ state: "loading", attempt: 0 });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new image address starts loading
    setPreview({ state: "loading", attempt: 0 });
  }, [socialSrc]);
  const previewSrc = preview.attempt ? `${socialSrc}&retry=${preview.attempt}` : socialSrc;
  function previewFailed() {
    if (preview.attempt < 2) setTimeout(() => setPreview((v) => ({ state: "loading", attempt: v.attempt + 1 })), 1500);
    else setPreview((v) => ({ ...v, state: "failed" }));
  }

  // Fetch the image and save it as a file. (A plain download link is ignored by some
  // browsers and in-app browsers, so nothing happens.)
  async function downloadSocial() {
    setDownloading("working");
    try {
      const res = await fetch(socialUrl, { credentials: "same-origin" });
      if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) throw new Error(`status ${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${props.businessName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "social"}-post.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setDownloading("idle");
    } catch {
      setDownloading("failed");
    }
  }
  useEffect(() => {
    const t = setTimeout(() => setSocialSrc(socialUrl), 500);
    return () => clearTimeout(t);
  }, [socialUrl]);

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_FLYER_PACKAGES ? s : [...s, id],
    );
  }

  const print = template !== "social" ? TEMPLATES[template] : null;
  const scale = print ? PREVIEW_WIDTH_PX / (print.widthIn * 96) : 1;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto]">
      <div className="space-y-5 print:hidden">
        <fieldset>
          <legend className="text-sm font-medium">What to make</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["flyer", "sign", "tent", "social"] as Template[]).map((t) => (
              <label
                key={t}
                className={`cursor-pointer rounded-md border p-2 text-sm ${template === t ? "border-brand ring-1 ring-brand" : "border-line"}`}
              >
                <input type="radio" name="template" className="sr-only" checked={template === t} onChange={() => setTemplate(t)} />
                <span className="font-medium">{t === "social" ? "Social post" : TEMPLATES[t].label}</span>
                <span className="block text-xs text-ink-muted">{t === "social" ? "Square image for Instagram/Facebook" : TEMPLATES[t].note}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <StylePicker value={styleId} onChange={setStyleId} color={props.color} />
        <FontPicker value={fontId} onChange={setFontId} />

        <fieldset>
          <legend className="text-sm font-medium">Packages to show (up to {MAX_FLYER_PACKAGES})</legend>
          {props.packages.length === 0 ? (
            <p className="mt-1 text-sm text-ink-muted">No active packages yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {props.packages.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      disabled={!selected.includes(p.id) && selected.length >= MAX_FLYER_PACKAGES}
                      onChange={() => toggle(p.id)}
                    />
                    {p.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <label className="block">
          <span className="text-sm font-medium">Headline</span>
          <input
            value={headline}
            maxLength={FLYER_LIMITS.headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Message</span>
          <textarea
            value={message}
            maxLength={FLYER_LIMITS.message}
            rows={3}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Your usual price per {props.singular} (optional)</span>
          <span className="mt-1 flex items-center gap-1 text-sm">
            $
            <input
              value={usual}
              inputMode="decimal"
              placeholder="e.g. 80"
              onChange={(e) => setUsual(e.target.value)}
              className="block w-28 rounded-md border border-line bg-surface px-3 py-2"
            />
          </span>
          <span className="mt-1 block text-xs text-ink-muted">Adds a &quot;Save 15%&quot; line to each package. Filled in from your regular price in Page settings.</span>
        </label>

        {props.logo && logoWidth !== null && logoWidth < MIN_LOGO_WIDTH_PX && (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            ⚠ Your logo is only {logoWidth} pixels wide, so it may look blurry in print. Upload a larger one (at least{" "}
            {MIN_LOGO_WIDTH_PX} pixels wide) in Page settings.
          </p>
        )}

        {template === "social" ? (
          <div>
            <button
              type="button"
              onClick={downloadSocial}
              disabled={downloading === "working"}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {downloading === "working" ? "Preparing image…" : "Download image"}
            </button>
            {downloading === "failed" ? (
              <p role="alert" className="mt-2 text-xs text-red-600">
                Couldn&apos;t download. Right-click the preview and choose &quot;Save image as…&quot; instead.
              </p>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">Saves a 1080 × 1080 PNG to your Downloads folder.</p>
            )}
          </div>
        ) : (
          <div>
            <button onClick={() => window.print()} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90">
              Print or save as PDF
            </button>
            <p className="mt-2 text-xs text-ink-muted">
              In the print window choose &quot;Save as PDF&quot; (or your printer), paper size {print?.landscape ? "Letter, landscape" : "Letter"},
              margins &quot;None&quot;, and tick &quot;Background graphics&quot;.
            </p>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium print:hidden">Preview</p>
        {template === "social" ? (
          <div className="relative overflow-hidden rounded-md border border-line bg-surface" style={{ width: PREVIEW_WIDTH_PX, height: PREVIEW_WIDTH_PX }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated image from our own route */}
            <img
              key={previewSrc}
              src={previewSrc}
              alt="Social post preview"
              width={PREVIEW_WIDTH_PX}
              height={PREVIEW_WIDTH_PX}
              onLoad={() => setPreview((v) => ({ ...v, state: "ready" }))}
              onError={previewFailed}
              className={preview.state === "ready" ? "" : "invisible"}
            />
            {preview.state !== "ready" && (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-ink-muted">
                {preview.state === "failed" ? "Couldn't draw the preview. Refresh the page to try again." : "Making the preview…"}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* the page size the browser should print at */}
            <style>{`@page { size: ${print!.landscape ? "11in 8.5in" : "8.5in 11in"}; margin: 0; }
${PRINT_CSS}`}</style>
            <div
              className="artwork-frame overflow-hidden rounded-md border border-line shadow-sm"
              style={{ width: PREVIEW_WIDTH_PX, height: print!.heightIn * 96 * scale }}
            >
              <div id="print-area" className="artwork-scale" style={{ ["--s" as string]: scale }}>
                <Artwork template={template} styleId={styleId} fontId={fontId} c={content} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
