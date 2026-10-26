import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Indlela · Carnet de progression",
    short_name: "Indlela",
    description: "Les cadres valident la progression des jeunes ; les familles la suivent.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F1E8",
    theme_color: "#F4F1E8",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
