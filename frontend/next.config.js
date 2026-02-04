const path = require('path');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
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
    const backendUrl = isDev 
      ? 'http://localhost:5001' 
      : 'https://lingloops-backend.onrender.com';
    
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
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
