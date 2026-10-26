import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { RegisterSW } from "@/components/RegisterSW";
import { NavTracker } from "@/lib/nav";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-jetbrains", display: "swap" });
// Police du carnet imprimable, identique quel que soit le thème.
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-plex", display: "swap" });

export const metadata: Metadata = {
  title: "Carnet de progression · Indlela",
  description: "Les cadres valident la progression des jeunes ; les familles la suivent.",
  applicationName: "Indlela",
  appleWebApp: { capable: true, title: "Indlela", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F4F1E8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${jetbrains.variable} ${plex.variable}`}>
      <body className="text-[15px] leading-[1.4] antialiased">
        <StoreProvider>{children}</StoreProvider>
        <NavTracker />
        <RegisterSW />
      </body>
    </html>
  );
}
