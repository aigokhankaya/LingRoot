const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', 'lingroot.com', 'ui-avatars.com', 'placehold.co', 'readdy.ai'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.lingroot.com',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5001/api/:path*',
      },
      {
        source: '/admin/:path*',
        destination: 'http://localhost:5001/admin/:path*',
      },
      {
        source: '/api/youtube-transcript',
        destination: 'http://localhost:8001/scrape-transcript',
      },
      {
        source: '/api/youtube-transcript-alt',
        destination: 'http://localhost:8051/scrape-transcript',
      },
    ];
  },
};

module.exports = nextConfig;
