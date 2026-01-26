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

  // Rewrites to proxy Convex storage through our domain
  // This improves email deliverability by matching image URLs to the sending domain
  async rewrites() {
    return [
      // Proxy Convex storage URLs: /storage/:id → Convex storage
      {
        source: '/storage/:path*',
        destination: `${process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.cloud', '.site') || 'https://agreeable-lion-828.convex.site'}/api/storage/:path*`,
      },
      // Proxy map directions through our domain (reduces spam score)
      {
        source: '/maps/google/:coords*',
        destination: 'https://www.google.com/maps/dir/?api=1&destination=:coords*',
      },
      {
        source: '/maps/apple/:coords*',
        destination: 'https://maps.apple.com/?daddr=:coords*',
      },
    ];
  },
};

export default nextConfig;
