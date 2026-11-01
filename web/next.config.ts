import type { NextConfig } from "next";

// Export statique : toute l'application tourne dans le navigateur (Supabase y est appelé directement),
// servie telle quelle par Cloudflare Pages. Les anciennes adresses /jeunes/:id repartent depuis app/not-found.tsx.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
};

export default nextConfig;
