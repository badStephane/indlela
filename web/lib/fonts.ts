// Polices Indlela (Google Fonts, auto-hébergées par next/font : rien n'est chargé depuis Google au runtime).
import { Atkinson_Hyperlegible_Next, Atkinson_Hyperlegible_Mono, Source_Serif_4, Poppins } from "next/font/google";

// Next n'a pas encore les métriques de cette police pour ajuster le repli : on le dit, sinon chaque build avertit.
export const atkinson = Atkinson_Hyperlegible_Next({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--font-atkinson", display: "swap", adjustFontFallback: false });
export const atkinsonMono = Atkinson_Hyperlegible_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-atkinson-mono", display: "swap" });
export const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400"], style: ["italic"], variable: "--font-source-serif", display: "swap" });
// Poppins Bold : logo seulement.
export const poppins = Poppins({ subsets: ["latin"], weight: ["700"], variable: "--font-poppins", display: "swap" });

export const fontVariables = [atkinson.variable, atkinsonMono.variable, sourceSerif.variable, poppins.variable].join(" ");
