import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

// The app's home-screen icon, drawn from the brand colours (so it follows brand.ts when
// the final name and colours are chosen): a white pass card with a check mark on the
// primary colour. No product name in the picture.
// `padded` leaves extra margin for "maskable" icons, which Android crops to a circle.
export function renderAppIcon(size: number, padded = false): ImageResponse {
  const card = padded ? 0.5 : 0.62; // share of the icon the card takes up
  const w = Math.round(size * card);
  const h = Math.round(w * 0.72);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: brand.colors.primary,
        }}
      >
        <svg width={w} height={h} viewBox="0 0 100 72">
          <rect x="0" y="0" width="100" height="72" rx="12" fill="#ffffff" />
          <rect x="0" y="50" width="100" height="12" fill={brand.colors.accent} />
          <rect x="0" y="50" width="100" height="22" rx="12" fill={brand.colors.accent} />
          <path
            d="M30 28 L44 41 L70 14"
            fill="none"
            stroke={brand.colors.primary}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
