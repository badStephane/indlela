import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { StoreProvider } from "@/lib/store";
import { PhotosProvider } from "@/lib/photosStore";
import { RegisterSW } from "@/components/RegisterSW";
import { NavTracker } from "@/lib/nav";
import "./globals.css";

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
    <html lang="fr" className={fontVariables}>
      <body className="text-[15px] leading-[1.4] antialiased">
        <StoreProvider>
          <PhotosProvider>{children}</PhotosProvider>
        </StoreProvider>
        <NavTracker />
        <RegisterSW />
      </body>
    </html>
  );
}
