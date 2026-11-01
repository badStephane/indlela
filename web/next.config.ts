import type { NextConfig } from "next";

// Export statique : toute l'application tourne dans le navigateur (Supabase y est appelé directement),
// servie telle quelle par Cloudflare. Les anciennes adresses /jeunes/:id sont redirigées par public/_redirects.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
};

export default nextConfig;
