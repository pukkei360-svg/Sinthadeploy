import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  swcMinify: true,
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@prisma/client'],
  },
  // Force HTML pages to never be cached — ensures APK WebView always
  // loads the latest version. Static JS/CSS chunks are hashed by Next.js
  // so they cache safely (new deploy = new hash = fresh fetch).
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '-1' },
        ],
      },
    ];
  },
};

export default nextConfig;
