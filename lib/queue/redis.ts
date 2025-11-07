/**
 * Redis Connection for BullMQ
 *
 * This configures the Redis connection for our job queue.
 * Uses Upstash Redis (free tier) for cloud-hosted Redis.
 *
 * Why Redis?
 * - BullMQ needs Redis to store job data
 * - Redis keeps track of queued, processing, completed, and failed jobs
 * - Much simpler than managing a database ourselves
 */

import { Redis } from 'ioredis';

/**
 * Create Redis connection
 * This is used by both the queue (API) and worker (background processor)
 */
export function createRedisConnection(): Redis {
  // Get Redis URL from environment (checked at runtime, not module load)
  const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

  if (!REDIS_URL) {
    console.error('❌ REDIS_URL not set in environment');
    console.error('   Add to .env.local:');
    console.error('   REDIS_URL="redis://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379"');
    throw new Error(
      'REDIS_URL is required. Sign up for free at https://upstash.com and add REDIS_URL to your environment variables.'
    );
  }

  console.log('🔗 Connecting to Redis...');

  const redis = new Redis(REDIS_URL, {
    // BullMQ requirements
    maxRetriesPerRequest: null,
    enableReadyCheck: false,

    // Upstash-specific optimizations (free tier needs generous timeouts)
    family: 6, // Use IPv6 if available
    connectTimeout: 30000, // 30s connection timeout
    commandTimeout: 15000, // 15s command timeout (free tier can be slow)
    keepAlive: 30000, // Keep connection alive

    // Aggressive retry strategy for free tier
    retryStrategy(times) {
      if (times > 10) {
        // Give up after 10 retries
        console.error('❌ Redis connection failed after 10 retries');
        return null;
      }
      const delay = Math.min(times * 100, 3000);
      return delay;
    },

    // Reconnect on error
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some(targetError => err.message.includes(targetError));
    },
  });

  let connectedOnce = false;

  redis.on('connect', () => {
    connectedOnce = true;
    console.log('✅ Redis connected successfully');
  });

  redis.on('error', (error) => {
    // Only log errors if we haven't connected yet (prevents spam)
    if (!connectedOnce) {
      console.error('❌ Redis connection error:', error.message);
    }
  });

  return redis;
}

/**
 * Get Redis connection configuration for BullMQ
 * Parses Redis URL and returns ioredis connection options
 */
export function getRedisConnectionOptions() {
  const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

  if (!REDIS_URL) {
    throw new Error(
      'REDIS_URL is required. Sign up for free at https://upstash.com and add REDIS_URL to your environment variables.'
    );
  }

  // Parse Redis URL: redis://username:password@host:port
  const url = new URL(REDIS_URL);

  return {
    connection: {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      username: url.username !== 'default' ? url.username : undefined,
      // BullMQ requirements
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      // Timeouts
      connectTimeout: 30000,
      commandTimeout: 15000,
      keepAlive: 30000,
    },
  };
}
