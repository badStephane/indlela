// Polices Indlela, hébergées dans le dépôt (lib/polices, sous-ensemble latin, licence SIL OFL 1.1).
// next/font/google plantait au hasard pendant le build : Google sert parfois ces polices par une adresse
// sans extension (/l/font?kit=…) que Next 15.5 ne sait pas lire. Rien n'est appelé chez Google, ni au build ni au runtime.
import localFont from "next/font/local";

// Polices variables : un seul fichier couvre toutes les graisses utilisées.
export const atkinson = localFont({
  src: "./polices/atkinson-next-latin.woff2",
  weight: "400 800",
  variable: "--font-atkinson",
  display: "swap",
});
export const atkinsonMono = localFont({
  src: "./polices/atkinson-mono-latin.woff2",
  weight: "400 500",
  variable: "--font-atkinson-mono",
  display: "swap",
  adjustFontFallback: false,
});
export const sourceSerif = localFont({
  src: "./polices/source-serif-4-italique-latin.woff2",
  weight: "400",
  style: "italic",
  variable: "--font-source-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
// Poppins Bold : logo seulement.
export const poppins = localFont({
  src: "./polices/poppins-700-latin.woff2",
  weight: "700",
  variable: "--font-poppins",
  display: "swap",
});

export const fontVariables = [atkinson.variable, atkinsonMono.variable, sourceSerif.variable, poppins.variable].join(" ");
