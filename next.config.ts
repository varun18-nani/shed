import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker multi-stage production builds
  output: "standalone",
};

export default nextConfig;
