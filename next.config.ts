import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* PWA Configuration */
  // Next.js 16 has built-in PWA support through metadata API
  // Service worker will be configured separately in app/service-worker.ts

  /* i18n Configuration */
  // Client-side i18n through React Context (no server-side i18n needed)

  /* Image Optimization */
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  /* Security Headers */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), microphone=(), camera=()',
          },
        ],
      },
    ];
  },

  /* Performance Optimizations */
  reactStrictMode: true,
  poweredByHeader: false,

  /* Experimental Features */
  experimental: {
    optimizePackageImports: ['leaflet', 'react-leaflet'],
  },

  /* Turbopack Configuration */
  // Empty config to silence the warning - Web Workers will be handled by Turbopack automatically
  turbopack: {},
};

export default nextConfig;
