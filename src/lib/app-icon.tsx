import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brand, wordmarkParts } from "@/config/brand";

// Figtree (the app's font) from @fontsource/figtree, so the icon matches the on-screen wordmark
function figtree(weight: 400 | 600): Promise<Buffer> {
  return readFile(join(process.cwd(), "node_modules/@fontsource/figtree/files", `figtree-latin-${weight}-normal.woff`));
}

// The app's home-screen and tab icon, drawn from brand.ts (so it follows the final name
// and colours): the full wordmark on navy, like logos/visitbundle-logo-dark.svg
// ("Visit" white semibold, "Bundle" light green).
// `padded` leaves extra margin for "maskable" icons, which Android crops to a circle.
export async function renderAppIcon(size: number, padded = false): Promise<ImageResponse> {
  const [first, second] = wordmarkParts();
  const [regular, semibold] = await Promise.all([figtree(400), figtree(600)]);
  // the wordmark is about 5.4 font-sizes wide; fill ~88% of the width (~64% when padded)
  const fontSize = Math.round((size * (padded ? 0.64 : 0.88)) / 5.4);
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
          fontFamily: "Figtree",
          fontSize,
          letterSpacing: -fontSize * 0.02,
        }}
      >
        <span style={{ color: "#ffffff", fontWeight: 600 }}>{first}</span>
        <span style={{ color: brand.colors.accentOnDark, fontWeight: 400 }}>{second}</span>
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [
        { name: "Figtree", data: regular, weight: 400, style: "normal" },
        { name: "Figtree", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
