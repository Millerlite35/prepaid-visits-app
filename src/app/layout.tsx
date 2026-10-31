import type { Metadata, Viewport } from "next";
import { Figtree, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { brand } from "@/config/brand";
import { designFontVariables } from "@/lib/design-fonts";

// App fonts: Figtree for everything, Newsreader (serif) for page titles and big numbers.
// Self-hosted by Next.js. Flyer/card fonts are separate (src/lib/design-fonts.ts).
const appSans = Figtree({
  variable: "--font-app-sans",
  subsets: ["latin"],
});

const appDisplay = Newsreader({
  variable: "--font-app-display",
  subsets: ["latin"],
});

// only for codes (pass codes, backup codes)
const appMono = Geist_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: brand.name,
  description: brand.tagline,
};

// colours the phone's status bar / browser bar to match the brand
export const viewport: Viewport = { themeColor: brand.colors.primary };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${appSans.variable} ${appDisplay.variable} ${appMono.variable} ${designFontVariables} h-full antialiased`}
      // brand colors as CSS variables, used through the bg-brand / text-brand classes
      style={
        {
          "--brand-primary": brand.colors.primary,
          "--brand-accent": brand.colors.accent,
          "--brand-accent-on-dark": brand.colors.accentOnDark,
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
