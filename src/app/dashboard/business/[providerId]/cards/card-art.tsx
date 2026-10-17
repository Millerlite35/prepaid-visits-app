import type { DesignStyle } from "@/lib/design-styles";

// One business-card-size (3.5 x 2 in) QR card. Only the business, a neutral label and
// the QR code: nothing about the client (the balance lives in the app).

export type CardBrand = { name: string; logo: string | null; color: string; label: string; contact: string[] };

export const CARD_W_IN = 3.5;
export const CARD_H_IN = 2;

export function QrCard({ b, qr, s }: { b: CardBrand; qr: string; s: DesignStyle }) {
  const accent = s.accent(b.color);
  const stripe = s.stripe(b.color);
  const minimal = s.frame === "line";
  const qrIn = minimal ? 1.35 : 1.15;

  return (
    <div
      style={{
        width: `${CARD_W_IN}in`,
        height: `${CARD_H_IN}in`,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        background: s.pageBg,
        color: s.ink,
        fontFamily: s.bodyFont,
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {/* the style's frame */}
      {s.frame === "band" && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "0.14in", background: stripe }} />}
      {s.frame === "stripe" && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "0.12in", background: stripe }} />}
      {s.frame === "rules" && (
        <>
          <div style={{ position: "absolute", left: "0.12in", right: "0.12in", top: "0.1in", borderTop: `1.5pt solid ${accent}` }} />
          <div style={{ position: "absolute", left: "0.12in", right: "0.12in", bottom: "0.1in", borderBottom: `1.5pt solid ${accent}` }} />
        </>
      )}
      {s.frame === "double" && (
        <div style={{ position: "absolute", inset: "0.07in", border: `1.5pt solid ${accent}`, borderRadius: "0.08in", padding: "2pt" }}>
          <div style={{ width: "100%", height: "100%", border: `0.5pt solid ${accent}`, borderRadius: "0.06in", boxSizing: "border-box" }} />
        </div>
      )}

      <div
        style={{
          position: "relative",
          height: "100%",
          boxSizing: "border-box",
          padding: s.frame === "stripe" ? "0.18in 0.16in 0.18in 0.3in" : "0.2in 0.18in",
          display: "flex",
          alignItems: "center",
          gap: "0.14in",
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.06in" }}>
          {b.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- provider-uploaded logo from storage
            <img src={b.logo} alt="" style={{ maxHeight: b.contact.length ? "0.42in" : "0.55in", maxWidth: "100%", objectFit: "contain", objectPosition: "left" }} />
          ) : (
            <p style={{ margin: 0, fontSize: "11.5pt", fontWeight: 700, lineHeight: 1.15, color: accent, fontFamily: s.headingFont }}>{b.name}</p>
          )}
          {b.logo && b.contact.length === 0 && !minimal && (
            <p style={{ margin: 0, fontSize: "8pt", fontWeight: 700, color: accent, fontFamily: s.headingFont }}>{b.name}</p>
          )}
          {b.contact.map((line) => (
            <p key={line} style={{ margin: 0, fontSize: "6.5pt", lineHeight: 1.25, color: s.ink }}>
              {line}
            </p>
          ))}
          {!minimal && <div style={{ borderTop: `0.75pt solid ${accent}`, opacity: 0.6, width: "100%" }} />}
          <p style={{ margin: 0, fontSize: "7pt", color: s.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{b.label}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.03in" }}>
          <div style={{ background: "#ffffff", padding: "0.04in", borderRadius: "0.04in" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated QR code (inline SVG data) */}
            <img src={qr} alt="Card QR code" style={{ width: `${qrIn}in`, height: `${qrIn}in`, display: "block" }} />
          </div>
          <span style={{ fontSize: "6.5pt", color: s.muted }}>Scan at check-in</span>
        </div>
      </div>
    </div>
  );
}
