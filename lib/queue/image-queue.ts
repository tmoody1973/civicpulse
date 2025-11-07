/**
 * Image Fetch Queue
 *
 * Background queue for fetching images from Unsplash for news articles and stories.
 * Runs asynchronously to avoid blocking brief generation.
 */

import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from './redis';

export interface ImageJobData {
  // Article/story info
  articleId?: string;
  articleUrl?: string; // For fetching og:image
  briefId?: string;
  title: string;
  description: string;
  keywords: string[]; // For better image search

  // User context (optional)
  userId?: string;
  policyArea?: string;
}

export const imageQueue = new Queue<ImageJobData>('image-fetch', {
  ...getRedisConnectionOptions(),
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s delay
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});
