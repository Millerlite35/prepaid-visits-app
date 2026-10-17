import type { Metadata } from "next";
import { brand } from "@/config/brand";

// Page settings that make the STAFF side installable ("Add to Home Screen") and open full
// screen. Used by the dashboard, sign-in, two-step and self check-in layouts only, never on
// client pages (purchase, pass), so a client saving their pass isn't sent to the dashboard.
export const installableApp: Metadata = {
  manifest: "/app.webmanifest",
  appleWebApp: { capable: true, title: brand.name, statusBarStyle: "default" },
};
