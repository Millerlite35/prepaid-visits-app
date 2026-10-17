import { Lora, Merriweather, Montserrat, Nunito, Playfair_Display } from "next/font/google";

// Heading fonts for flyers and cards (see DESIGN_FONTS). Self-hosted by Next.js, so no
// requests go to Google from the browser. preload: false, so pages that don't use them
// don't download them.
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", preload: false });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", preload: false });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", preload: false });
const merriweather = Merriweather({ subsets: ["latin"], variable: "--font-merriweather", weight: ["400", "700"], preload: false });

export const designFontVariables = [montserrat, nunito, playfair, lora, merriweather].map((f) => f.variable).join(" ");
