const path = require('path');
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'echarts',
      'recharts',
      'firebase',
      'lodash',
      '@radix-ui/react-icons',
    ],
  },
  images: {
    domains: ['localhost', 'lingroot.com', 'ui-avatars.com', 'placehold.co', 'readdy.ai'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.lingroot.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  async rewrites() {
    // Determine backend URL based on environment
    const isDev = process.env.NODE_ENV === 'development';
    const backendUrl = process.env.BACKEND_URL
      || (isDev ? 'http://localhost:5001' : 'https://lingloops-backend.onrender.com');
    
    console.log('[NEXT.JS REWRITES] Environment:', process.env.NODE_ENV);
    console.log('[NEXT.JS REWRITES] Backend URL:', backendUrl);
    
    return [
      // Specific API routes first (before catch-all)
      {
        source: '/api/youtube-transcript',
        destination: isDev 
          ? 'http://localhost:8001/scrape-transcript'
          : `${backendUrl}/api/youtube-transcript`,
      },
      {
        source: '/api/youtube-transcript-alt',
        destination: isDev 
          ? 'http://localhost:8051/scrape-transcript'
          : `${backendUrl}/api/youtube-transcript-alt`,
      },
      // Route all other API requests to the backend Express server
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      // Internal service-to-service endpoints (Bearer API-key protected).
      // Lets external integrators (e.g. Video Factory) reach /internal/* via the
      // public domain through the same backend proxy used for /api/*.
      {
        source: '/internal/:path*',
        destination: `${backendUrl}/internal/:path*`,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
