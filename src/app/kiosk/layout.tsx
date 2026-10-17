import { installableApp } from "@/lib/app-metadata";

export const metadata = installableApp;

export default function KioskLayout({ children }: LayoutProps<"/kiosk">) {
  return children;
}
