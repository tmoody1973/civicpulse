import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next.js 16+ has MCP server enabled by default
  // No need for experimental.mcpServer flag

  // Enable strict mode for better error handling
  reactStrictMode: true,

  // Netlify deployment - let @netlify/plugin-nextjs handle everything
  // DO NOT set output or publish directory

  // Image optimization for Vultr CDN and external sources
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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.perplexity.ai',
      },
      {
        protocol: 'https',
        hostname: '**.pplx.ai',
      },
      // Allow common news source image domains
      {
        protocol: 'https',
        hostname: '**.cnn.com',
      },
      {
        protocol: 'https',
        hostname: '**.npr.org',
      },
      {
        protocol: 'https',
        hostname: '**.politico.com',
      },
      {
        protocol: 'https',
        hostname: '**.thehill.com',
      },
      {
        protocol: 'https',
        hostname: '**.washingtonpost.com',
      },
      {
        protocol: 'https',
        hostname: '**.nytimes.com',
      },
      {
        protocol: 'https',
        hostname: '**.reuters.com',
      },
      {
        protocol: 'https',
        hostname: '**.apnews.com',
      },
      {
        protocol: 'https',
        hostname: '**.kff.org',
      },
      {
        protocol: 'https',
        hostname: '**.cedar.com',
      },
      {
        protocol: 'https',
        hostname: '**.ama-assn.org',
      },
      {
        protocol: 'https',
        hostname: 'kubrick.htvapps.com',
      },
      // YouTube thumbnails (common in news embeds)
      {
        protocol: 'https',
        hostname: '**.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      // Common image CDNs and news source images
      {
        protocol: 'https',
        hostname: '**.wp.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: '**.texastribune.org',
      },
      {
        protocol: 'https',
        hostname: '**.collegeaidservices.net',
      },
    ],
  },

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
};

export default nextConfig;
