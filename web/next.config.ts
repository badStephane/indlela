import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Anciennes adresses des écrans d'un jeune (/jeunes/:id…), gardées pour les favoris.
  async redirects() {
    return [
      { source: "/jeunes/:id", destination: "/jeune?id=:id", permanent: true },
      { source: "/jeunes/:id/:screen(valider|carnet|cour)", destination: "/jeune/:screen?id=:id", permanent: true },
    ];
  },
};

export default nextConfig;
