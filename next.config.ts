import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pure client-side SPA (no API / server features) → export to static HTML/JS
  // so the whole app can be bundled into the npx installer and served locally.
  output: "export",
  allowedDevOrigins: ["192.168.1.197"],
};

export default nextConfig;
