import { brand } from "@/config/brand";

// The web app manifest: lets providers "Add to Home Screen" and open the app full screen.
// Linked only from staff pages (dashboard, sign-in, two-step, self check-in), so a
// client who saves their pass page isn't sent to the providers' dashboard instead.
// No service worker: nothing is stored offline (client data stays on the server).
export function GET() {
  const manifest = {
    id: "/dashboard",
    name: brand.name,
    short_name: brand.name,
    description: brand.tagline,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: brand.colors.primary,
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
