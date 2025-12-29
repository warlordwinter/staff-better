import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    // Removed unoptimized: true to enable Next.js image optimization
    // This provides automatic WebP conversion, responsive sizing, and compression
  },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
