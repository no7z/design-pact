import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pure client-side SPA (no API / server features) → static export so the whole
  // app bundles into the design-pact package and serves locally.
  output: "export",
  allowedDevOrigins: ["192.168.1.197"],
};

export default nextConfig;
