import { installableApp } from "@/lib/app-metadata";

export const metadata = installableApp;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
