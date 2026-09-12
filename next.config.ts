import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for Docker/self-hosted deployments.
  // Vercel's build adapter is incompatible with standalone output and throws
  // ENOENT: no such file or directory, open '.next/next-server.js.nft.json'
  // so we disable it when running on Vercel.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
