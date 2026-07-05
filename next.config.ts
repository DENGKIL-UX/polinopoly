import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Cloudflare Workers can't use sharp (native module)
  images: {
    unoptimized: true,
  },
  // Exclude server-side-only packages that don't work on Workers
  experimental: {
    // Cloudflare Workers compatibility
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
