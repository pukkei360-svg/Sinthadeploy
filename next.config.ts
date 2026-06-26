import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Enable compiler-based minification (faster + smaller than Terser)
  swcMinify: true,
  // Enable gzip compression for static files
  compress: true,
  // Optimize package imports (tree-shaking)
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@prisma/client'],
  },
};

export default nextConfig;
