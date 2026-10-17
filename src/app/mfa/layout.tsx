import { installableApp } from "@/lib/app-metadata";

export const metadata = installableApp;

export default function MfaLayout({ children }: LayoutProps<"/mfa">) {
  return children;
}
