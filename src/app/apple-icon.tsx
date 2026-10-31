import { renderAppIcon } from "@/lib/app-icon";

// iPhone/iPad home-screen icon (iOS rounds the corners itself).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return renderAppIcon(180);
}
