import type { ReactNode } from "react";
import { packageLines, type FlyerContent } from "@/lib/flyer-content";

// Printable templates, sized in real inches so "Save as PDF" comes out at the right size.
// White background with the brand colour as accent: easy to read, light on ink, and logos
// with transparent backgrounds look right.

export type PrintTemplate = "flyer" | "sign" | "tent";

export const TEMPLATES: Record<PrintTemplate, { label: string; note: string; widthIn: number; heightIn: number; landscape: boolean }> = {
  flyer: { label: "Flyer", note: "Full page (8.5 × 11 in)", widthIn: 8.5, heightIn: 11, landscape: false },
  sign: { label: "Counter sign", note: "5 × 7 in, printed on a full page with cut lines", widthIn: 8.5, heightIn: 11, landscape: false },
  tent: { label: "Table tent", note: "Landscape page, fold along the middle line", widthIn: 11, heightIn: 8.5, landscape: true },
};

function Brand({ c, logoMaxIn }: { c: FlyerContent; logoMaxIn: number }) {
  return c.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- provider-uploaded logo from storage
    <img src={c.logo} alt={`${c.businessName} logo`} style={{ maxHeight: `${logoMaxIn}in`, maxWidth: "80%", objectFit: "contain" }} />
  ) : (
    <p style={{ fontSize: "28pt", fontWeight: 700, color: c.color, margin: 0 }}>{c.businessName}</p>
  );
}

function Qr({ c, sizeIn, caption }: { c: FlyerContent; sizeIn: number; caption: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.08in" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- generated QR code (inline SVG data) */}
      <img src={c.qrDataUrl} alt="QR code to buy a package" style={{ width: `${sizeIn}in`, height: `${sizeIn}in` }} />
      <div style={{ textAlign: "center", fontSize: "11pt", lineHeight: 1.3 }}>{caption}</div>
    </div>
  );
}

function Packages({ c, compact = false }: { c: FlyerContent; compact?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: compact ? "column" : "row", gap: compact ? "0.06in" : "0.2in", justifyContent: "center", width: "100%" }}>
      {c.packages.map((p) => {
        const l = packageLines(p, c.singular, c.plural, c.usualPriceCents);
        return compact ? (
          <p key={p.id} style={{ margin: 0, fontSize: "11pt" }}>
            <strong>{l.title}:</strong> {l.detail}
            {l.saving && <strong style={{ color: c.color }}> · {l.saving}</strong>}
          </p>
        ) : (
          <div
            key={p.id}
            style={{ flex: 1, maxWidth: "2.5in", border: `2.5pt solid ${c.color}`, borderRadius: "0.15in", padding: "0.18in 0.12in", textAlign: "center" }}
          >
            <p style={{ margin: 0, fontSize: "14pt", fontWeight: 700 }}>{l.title}</p>
            <p style={{ margin: "0.08in 0 0", fontSize: "12pt" }}>{l.detail}</p>
            {l.perVisit && <p style={{ margin: "0.04in 0 0", fontSize: "10.5pt", color: "#52525b" }}>{l.perVisit}</p>}
            {l.saving && (
              <p style={{ margin: "0.1in 0 0", fontSize: "13pt", fontWeight: 700, color: c.color }}>{l.saving}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const page = (w: number, h: number): React.CSSProperties => ({
  width: `${w}in`,
  height: `${h}in`,
  background: "#ffffff",
  color: "#18181b",
  fontFamily: "Arial, Helvetica, sans-serif",
  boxSizing: "border-box",
  overflow: "hidden",
  position: "relative",
  printColorAdjust: "exact",
  WebkitPrintColorAdjust: "exact",
});

export function Flyer({ c }: { c: FlyerContent }) {
  return (
    <div style={{ ...page(8.5, 11), padding: "0.6in", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <Brand c={c} logoMaxIn={1.4} />
      <h1 style={{ margin: "0.45in 0 0", fontSize: "34pt", lineHeight: 1.1, color: c.color }}>{c.headline}</h1>
      <p style={{ margin: "0.25in 0 0", fontSize: "15pt", lineHeight: 1.4, maxWidth: "6.4in" }}>{c.message}</p>
      <div style={{ marginTop: "0.45in", width: "100%" }}>
        <Packages c={c} />
      </div>
      <div style={{ marginTop: "auto" }}>
        <Qr
          c={c}
          sizeIn={2.9}
          caption={
            <>
              <strong style={{ fontSize: "15pt" }}>Scan with your phone camera to buy</strong>
              <br />
              <span style={{ color: "#52525b" }}>{c.shortUrl}</span>
            </>
          }
        />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "0.3in", background: c.color }} />
    </div>
  );
}

// 5 x 7 in card centred on a letter page, with light corner cut marks
export function CounterSign({ c }: { c: FlyerContent }) {
  const mark: React.CSSProperties = { position: "absolute", width: "0.3in", height: "0.3in", borderColor: "#a1a1aa", borderStyle: "solid", borderWidth: 0 };
  return (
    <div style={{ ...page(8.5, 11), display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "5in", height: "7in" }}>
        <span style={{ ...mark, left: "-0.35in", top: "-0.35in", borderRightWidth: "0.5pt", borderBottomWidth: "0.5pt" }} />
        <span style={{ ...mark, right: "-0.35in", top: "-0.35in", borderLeftWidth: "0.5pt", borderBottomWidth: "0.5pt" }} />
        <span style={{ ...mark, left: "-0.35in", bottom: "-0.35in", borderRightWidth: "0.5pt", borderTopWidth: "0.5pt" }} />
        <span style={{ ...mark, right: "-0.35in", bottom: "-0.35in", borderLeftWidth: "0.5pt", borderTopWidth: "0.5pt" }} />
        <div
          style={{
            width: "100%",
            height: "100%",
            border: `4pt solid ${c.color}`,
            borderRadius: "0.2in",
            padding: "0.35in",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Brand c={c} logoMaxIn={0.9} />
          <h1 style={{ margin: "0.25in 0 0", fontSize: "21pt", lineHeight: 1.15, color: c.color }}>{c.headline}</h1>
          <div style={{ marginTop: "0.25in" }}>
            <Packages c={c} compact />
          </div>
          <div style={{ marginTop: "auto" }}>
            <Qr c={c} sizeIn={2} caption={<strong>Scan to buy a {c.singular} package</strong>} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TentPanel({ c }: { c: FlyerContent }) {
  return (
    <div style={{ height: "4.25in", padding: "0.4in 0.6in", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "0.5in" }}>
      <Qr c={c} sizeIn={2.4} caption={<strong>Scan to buy</strong>} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.14in" }}>
        <Brand c={c} logoMaxIn={0.8} />
        <h1 style={{ margin: 0, fontSize: "22pt", lineHeight: 1.15, color: c.color }}>{c.headline}</h1>
        <Packages c={c} compact />
      </div>
    </div>
  );
}

// Folded in half: the top half is upside down so both sides read correctly when it stands.
export function TableTent({ c }: { c: FlyerContent }) {
  return (
    <div style={page(11, 8.5)}>
      <div style={{ transform: "rotate(180deg)" }}>
        <TentPanel c={c} />
      </div>
      <div style={{ borderTop: "1pt dashed #a1a1aa", position: "relative" }}>
        <span style={{ position: "absolute", right: "0.2in", top: "-0.09in", fontSize: "7pt", color: "#a1a1aa", background: "#fff", padding: "0 4pt" }}>
          fold
        </span>
      </div>
      <TentPanel c={c} />
    </div>
  );
}

export function Artwork({ template, c }: { template: PrintTemplate; c: FlyerContent }) {
  if (template === "sign") return <CounterSign c={c} />;
  if (template === "tent") return <TableTent c={c} />;
  return <Flyer c={c} />;
}
