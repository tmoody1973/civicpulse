import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next.js 16+ has MCP server enabled by default
  // No need for experimental.mcpServer flag

  // Enable strict mode for better error handling
  reactStrictMode: true,

  // Image optimization for Vultr CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vultr.com',
      },
      {
        protocol: 'https',
        hostname: 'bioguide.congress.gov',
      },
      {
        protocol: 'https',
        hostname: 'www.congress.gov',
      },
    ],
  },

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
};

export default nextConfig;
