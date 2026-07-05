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
};

export default nextConfig;
