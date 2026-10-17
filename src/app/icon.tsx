import { renderAppIcon } from "@/lib/app-icon";

// Browser tab icon (replaces the default Next.js favicon).
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return renderAppIcon(32);
}
