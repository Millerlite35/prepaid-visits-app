import { renderAppIcon } from "@/lib/app-icon";

// Home-screen icons listed in the app manifest: /app-icon/192, /app-icon/512 and
// /app-icon/maskable-512 (extra margin, for Android's round crop).
const ICONS: Record<string, { size: number; padded: boolean }> = {
  "192": { size: 192, padded: false },
  "512": { size: 512, padded: false },
  "maskable-512": { size: 512, padded: true },
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((size) => ({ size }));
}

export async function GET(_request: Request, { params }: RouteContext<"/app-icon/[size]">) {
  const icon = ICONS[(await params).size];
  if (!icon) return new Response("Not found", { status: 404 });
  return renderAppIcon(icon.size, icon.padded);
}
