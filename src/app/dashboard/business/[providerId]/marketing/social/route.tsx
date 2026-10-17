import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { requireManager } from "@/lib/auth";
import { DESIGN_STYLES, isDesignStyle } from "@/lib/design-styles";
import { FLYER_LIMITS, MAX_FLYER_PACKAGES, packageLines } from "@/lib/flyer-content";
import { loadMarketingData } from "@/lib/marketing";

// A square (1080 x 1080) social media image: logo, headline, packages and the QR code.
// Query: h = headline, m = message, p = package ids (comma separated), u = usual price
// per visit in cents (optional). Owners and managers only.
export async function GET(request: Request, { params }: RouteContext<"/dashboard/business/[providerId]/marketing/social">) {
  const { providerId } = await params;
  await requireManager(providerId);
  const data = await loadMarketingData(providerId);
  if (!data) return new Response("Not found", { status: 404 });

  const q = new URL(request.url).searchParams;
  const headline = (q.get("h") ?? "").slice(0, FLYER_LIMITS.headline);
  const message = (q.get("m") ?? "").slice(0, FLYER_LIMITS.message);
  const ids = (q.get("p") ?? "").split(",").filter(Boolean).slice(0, MAX_FLYER_PACKAGES);
  const usualRaw = Number(q.get("u"));
  const usual = Number.isSafeInteger(usualRaw) && usualRaw > 0 ? usualRaw : null;
  const packages = data.packages.filter((p) => ids.includes(p.id));
  const style = DESIGN_STYLES[isDesignStyle(q.get("s")) ? (q.get("s") as keyof typeof DESIGN_STYLES) : "professional"];
  const accent = style.accent(data.color);
  const stripe = style.stripe(data.color);
  // the image renderer can't draw WebP; fall back to the business name
  const logo = data.logo && !data.logo.toLowerCase().endsWith(".webp") ? data.logo : null;
  // PNG for the image renderer (it handles PNG data more reliably than SVG)
  const qr = await QRCode.toDataURL(data.purchaseUrl, { errorCorrectionLevel: "Q", margin: 1, width: 600 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: style.pageBg,
          color: style.ink,
          borderLeft: style.frame === "stripe" ? `28px solid ${stripe}` : undefined,
          border: style.frame === "double" ? `12px solid ${accent}` : undefined,
          padding: "70px 70px 0",
          fontFamily: "sans-serif",
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered to an image on the server
          <img src={logo} alt="" style={{ maxHeight: 130, maxWidth: 600, objectFit: "contain" }} />
        ) : (
          <div style={{ fontSize: 56, fontWeight: 700, color: accent }}>{data.businessName}</div>
        )}
        <div style={{ marginTop: 40, fontSize: 64, fontWeight: 700, lineHeight: 1.1, color: accent, textAlign: "center" }}>
          {headline}
        </div>
        {message && (
          <div style={{ marginTop: 24, fontSize: 30, lineHeight: 1.35, textAlign: "center", color: style.muted }}>{message}</div>
        )}
        <div style={{ display: "flex", flex: 1, width: "100%", alignItems: "center", gap: 40, marginTop: 30 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 18 }}>
            {packages.map((p) => {
              const l = packageLines(p, data.singular, data.plural, usual);
              return (
                <div
                  key={p.id}
                  style={{ display: "flex", flexDirection: "column", border: style.packageBoxes ? `5px solid ${accent}` : "none", borderBottom: style.packageBoxes ? `5px solid ${accent}` : `2px solid ${accent}`, borderRadius: style.packageBoxes ? 24 : 0, padding: "16px 24px", background: "#ffffff" }}
                >
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{l.title}</div>
                  <div style={{ fontSize: 28 }}>{l.saving ? `${l.detail} · ${l.saving}` : l.detail}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered to an image on the server */}
            <img src={qr} alt="" width={300} height={300} style={{ background: "#ffffff", padding: 8 }} />
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8 }}>Scan to buy</div>
            <div style={{ fontSize: 22, color: style.muted }}>{data.shortUrl}</div>
            {data.contact.map((l) => (
              <div key={l} style={{ fontSize: 20, color: style.muted, maxWidth: 340, textAlign: "center" }}>
                {l}
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: 1080, height: style.frame === "band" ? 28 : style.frame === "stripe" ? 0 : 6, background: stripe, marginTop: 40 }} />
      </div>
    ),
    { width: 1080, height: 1080, headers: { "Cache-Control": "private, no-store" } },
  );
}
