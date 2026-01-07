import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: '**.convex.cloud',
      },
      {
        protocol: 'https',
        hostname: '**.convex.site',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  async rewrites() {
    const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.cloud', '.site') || '';
    return [
      // Proxy CLI application routes to Convex HTTP endpoints
      {
        source: '/api/v1/cli/:path*',
        destination: `${convexSiteUrl}/api/v1/cli/:path*`,
      },
    ];
  },
};

export default nextConfig;
