import type { ReactNode } from "react";
import { DESIGN_STYLES, resolveStyle, type DesignFontId, type DesignStyle, type DesignStyleId } from "@/lib/design-styles";
import { packageLines, type FlyerContent } from "@/lib/flyer-content";

// Printable templates, sized in real inches so "Save as PDF" comes out at the right size.
// The design style (professional, warm, minimal, classic, bordered) sets the colours,
// fonts and frame; the provider's brand colour runs through all of them.

export type PrintTemplate = "flyer" | "sign" | "tent";

export const TEMPLATES: Record<PrintTemplate, { label: string; note: string; widthIn: number; heightIn: number; landscape: boolean }> = {
  flyer: { label: "Flyer", note: "Full page (8.5 × 11 in)", widthIn: 8.5, heightIn: 11, landscape: false },
  sign: { label: "Counter sign", note: "5 × 7 in, printed on a full page with cut lines", widthIn: 8.5, heightIn: 11, landscape: false },
  tent: { label: "Table tent", note: "Landscape page, fold along the middle line", widthIn: 11, heightIn: 8.5, landscape: true },
};

type Ctx = { c: FlyerContent; s: DesignStyle };

function Brand({ c, s, logoMaxIn }: Ctx & { logoMaxIn: number }) {
  return c.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- provider-uploaded logo from storage
    <img src={c.logo} alt={`${c.businessName} logo`} style={{ maxHeight: `${logoMaxIn}in`, maxWidth: "80%", objectFit: "contain" }} />
  ) : (
    <p style={{ fontSize: "28pt", fontWeight: 700, color: s.accent(c.color), fontFamily: s.headingFont, margin: 0 }}>{c.businessName}</p>
  );
}

function Qr({ c, s, sizeIn, caption }: Ctx & { sizeIn: number; caption: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.08in" }}>
      {/* white box, so the code scans well on cream backgrounds too */}
      <div style={{ background: "#ffffff", padding: "0.06in", borderRadius: "0.06in" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- generated QR code (inline SVG data) */}
        <img src={c.qrDataUrl} alt="QR code to buy a package" style={{ width: `${sizeIn}in`, height: `${sizeIn}in`, display: "block" }} />
      </div>
      <div style={{ textAlign: "center", fontSize: "11pt", lineHeight: 1.3, color: s.ink }}>{caption}</div>
    </div>
  );
}

function Packages({ c, s, compact = false }: Ctx & { compact?: boolean }) {
  const accent = s.accent(c.color);
  if (compact || !s.packageBoxes) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? "0.06in" : "0.14in", alignItems: compact ? "flex-start" : "center", width: "100%" }}>
        {c.packages.map((p) => {
          const l = packageLines(p, c.singular, c.plural, c.usualPriceCents);
          return (
            <p key={p.id} style={{ margin: 0, fontSize: compact ? "11pt" : "15pt" }}>
              <strong>{l.title}:</strong> {l.detail}
              {!compact && l.perVisit && <span style={{ color: s.muted }}> ({l.perVisit})</span>}
              {l.saving && <strong style={{ color: accent }}> · {l.saving}</strong>}
            </p>
          );
        })}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: "0.2in", justifyContent: "center", width: "100%" }}>
      {c.packages.map((p) => {
        const l = packageLines(p, c.singular, c.plural, c.usualPriceCents);
        return (
          <div
            key={p.id}
            style={{ flex: 1, maxWidth: "2.5in", border: `2.5pt solid ${accent}`, borderRadius: "0.15in", padding: "0.18in 0.12in", textAlign: "center", background: "#ffffff" }}
          >
            <p style={{ margin: 0, fontSize: "14pt", fontWeight: 700, fontFamily: s.headingFont }}>{l.title}</p>
            <p style={{ margin: "0.08in 0 0", fontSize: "12pt" }}>{l.detail}</p>
            {l.perVisit && <p style={{ margin: "0.04in 0 0", fontSize: "10.5pt", color: s.muted }}>{l.perVisit}</p>}
            {l.saving && <p style={{ margin: "0.1in 0 0", fontSize: "13pt", fontWeight: 700, color: accent }}>{l.saving}</p>}
          </div>
        );
      })}
    </div>
  );
}

const page = (w: number, h: number, s: DesignStyle): React.CSSProperties => ({
  width: `${w}in`,
  height: `${h}in`,
  background: s.pageBg,
  color: s.ink,
  fontFamily: s.bodyFont,
  boxSizing: "border-box",
  overflow: "hidden",
  position: "relative",
  printColorAdjust: "exact",
  WebkitPrintColorAdjust: "exact",
});

// The style's frame drawn inside a box (page, sign or tent panel)
function Frame({ c, s, insetIn = 0.25 }: Ctx & { insetIn?: number }) {
  const accent = s.accent(c.color);
  const stripe = s.stripe(c.color);
  const abs: React.CSSProperties = { position: "absolute", pointerEvents: "none" };
  switch (s.frame) {
    case "band":
      return <div style={{ ...abs, left: 0, right: 0, bottom: 0, height: "0.3in", background: stripe }} />;
    case "topbar":
      return (
        <>
          <div style={{ ...abs, left: 0, right: 0, top: 0, height: "0.45in", background: stripe }} />
          <div style={{ ...abs, left: 0, right: 0, bottom: 0, height: "0.08in", background: stripe }} />
        </>
      );
    case "stripe":
      return <div style={{ ...abs, left: 0, top: 0, bottom: 0, width: "0.3in", background: stripe }} />;
    case "line":
      return <div style={{ ...abs, left: `${insetIn}in`, right: `${insetIn}in`, bottom: `${insetIn}in`, height: "2pt", background: stripe }} />;
    case "rules":
      return (
        <>
          <div style={{ ...abs, left: `${insetIn}in`, right: `${insetIn}in`, top: `${insetIn}in`, borderTop: `3pt solid ${accent}`, paddingTop: "3pt" }}>
            <div style={{ borderTop: `0.75pt solid ${accent}` }} />
          </div>
          <div style={{ ...abs, left: `${insetIn}in`, right: `${insetIn}in`, bottom: `${insetIn}in`, borderBottom: `3pt solid ${accent}`, paddingBottom: "3pt" }}>
            <div style={{ borderBottom: `0.75pt solid ${accent}` }} />
          </div>
        </>
      );
    case "double":
      return (
        <div style={{ ...abs, inset: `${insetIn}in`, border: `3pt solid ${accent}`, borderRadius: "0.12in", padding: "4pt" }}>
          <div style={{ width: "100%", height: "100%", border: `0.75pt solid ${accent}`, borderRadius: "0.08in", boxSizing: "border-box" }} />
        </div>
      );
  }
}

export function Flyer({ c, s }: Ctx) {
  const minimal = s.frame === "line";
  return (
    <div style={page(8.5, 11, s)}>
      <Frame c={c} s={s} insetIn={0.35} />
      <div style={{ position: "relative", height: "100%", boxSizing: "border-box", padding: "0.75in", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <Brand c={c} s={s} logoMaxIn={1.4} />
        <h1 style={{ margin: "0.45in 0 0", fontSize: "34pt", lineHeight: 1.1, color: s.accent(c.color), fontFamily: s.headingFont, fontWeight: minimal ? 600 : 700 }}>
          {c.headline}
        </h1>
        <p style={{ margin: "0.25in 0 0", fontSize: "15pt", lineHeight: 1.4, maxWidth: "6.4in" }}>{c.message}</p>
        <div style={{ marginTop: "0.4in", width: "100%" }}>
          <Packages c={c} s={s} />
        </div>
        <div style={{ marginTop: "auto" }}>
          <Qr
            c={c}
            s={s}
            sizeIn={minimal ? 3.4 : 2.9}
            caption={
              <>
                <strong style={{ fontSize: "15pt" }}>Scan with your phone camera to buy</strong>
                <br />
                <span style={{ color: s.muted }}>{c.shortUrl}</span>
                {c.contact.length > 0 && (
                  <span style={{ display: "block", marginTop: "0.18in", fontSize: "11pt", color: s.ink }}>{c.contact.join("  ·  ")}</span>
                )}
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}

// 5 x 7 in card centred on a letter page, with light corner cut marks
export function CounterSign({ c, s }: Ctx) {
  const mark: React.CSSProperties = { position: "absolute", width: "0.3in", height: "0.3in", borderColor: "#a1a1aa", borderStyle: "solid", borderWidth: 0 };
  return (
    <div style={{ ...page(8.5, 11, DESIGN_STYLES.professional), display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "5in", height: "7in" }}>
        <span style={{ ...mark, left: "-0.35in", top: "-0.35in", borderRightWidth: "0.5pt", borderBottomWidth: "0.5pt" }} />
        <span style={{ ...mark, right: "-0.35in", top: "-0.35in", borderLeftWidth: "0.5pt", borderBottomWidth: "0.5pt" }} />
        <span style={{ ...mark, left: "-0.35in", bottom: "-0.35in", borderRightWidth: "0.5pt", borderTopWidth: "0.5pt" }} />
        <span style={{ ...mark, right: "-0.35in", bottom: "-0.35in", borderLeftWidth: "0.5pt", borderTopWidth: "0.5pt" }} />
        <div style={{ ...page(5, 7, s), position: "relative" }}>
          <Frame c={c} s={s} insetIn={0.18} />
          <div style={{ position: "relative", height: "100%", boxSizing: "border-box", padding: "0.45in", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <Brand c={c} s={s} logoMaxIn={0.9} />
            <h1 style={{ margin: "0.25in 0 0", fontSize: "21pt", lineHeight: 1.15, color: s.accent(c.color), fontFamily: s.headingFont }}>{c.headline}</h1>
            <div style={{ marginTop: "0.25in" }}>
              <Packages c={c} s={s} compact />
            </div>
            <div style={{ marginTop: "auto" }}>
              <Qr
                c={c}
                s={s}
                sizeIn={2}
                caption={
                  <>
                    <strong>Scan to buy a {c.singular} package</strong>
                    {c.contact.map((l) => (
                      <span key={l} style={{ display: "block", fontSize: "9pt", color: s.muted }}>
                        {l}
                      </span>
                    ))}
                  </>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TentPanel({ c, s }: Ctx) {
  return (
    <div style={{ position: "relative", height: "4.25in" }}>
      <Frame c={c} s={s} insetIn={0.2} />
      <div style={{ position: "relative", height: "100%", padding: "0.45in 0.7in", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "0.5in" }}>
        <Qr c={c} s={s} sizeIn={2.4} caption={<strong>Scan to buy</strong>} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.14in" }}>
          <Brand c={c} s={s} logoMaxIn={0.8} />
          <h1 style={{ margin: 0, fontSize: "22pt", lineHeight: 1.15, color: s.accent(c.color), fontFamily: s.headingFont }}>{c.headline}</h1>
          <Packages c={c} s={s} compact />
          {c.contact.length > 0 && <p style={{ margin: 0, fontSize: "10pt", color: s.muted }}>{c.contact.join("  ·  ")}</p>}
        </div>
      </div>
    </div>
  );
}

// Folded in half: the top half is upside down so both sides read correctly when it stands.
export function TableTent({ c, s }: Ctx) {
  return (
    <div style={page(11, 8.5, s)}>
      <div style={{ transform: "rotate(180deg)" }}>
        <TentPanel c={c} s={s} />
      </div>
      <div style={{ borderTop: "1pt dashed #a1a1aa", position: "relative" }}>
        <span style={{ position: "absolute", right: "0.2in", top: "-0.09in", fontSize: "7pt", color: "#a1a1aa", background: s.pageBg, padding: "0 4pt" }}>
          fold
        </span>
      </div>
      <TentPanel c={c} s={s} />
    </div>
  );
}

export function Artwork({ template, styleId, fontId, c }: { template: PrintTemplate; styleId: DesignStyleId; fontId: DesignFontId; c: FlyerContent }) {
  const s = resolveStyle(styleId, fontId);
  if (template === "sign") return <CounterSign c={c} s={s} />;
  if (template === "tent") return <TableTent c={c} s={s} />;
  return <Flyer c={c} s={s} />;
}
