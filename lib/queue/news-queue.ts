/**
 * News Generation Queue
 *
 * This queue handles background fetching of personalized news.
 *
 * Flow:
 * 1. API route adds job to queue (returns immediately with job ID)
 * 2. Worker picks up job from queue (runs in background)
 * 3. Worker processes job (fetches news, enriches with images - takes 20-30s)
 * 4. Worker updates database with result
 * 5. Frontend polls for completion
 */

import { Queue, QueueOptions } from 'bullmq';
import { getRedisConnectionOptions } from './redis';

/**
 * Job data structure
 * This is what we pass when adding a job to the queue
 */
export interface NewsJobData {
  userId: string;
  userEmail: string;
  interests: string[];
  state?: string;
  district?: string;
  limit: number;
  forceRefresh?: boolean;
}

/**
 * Queue configuration
 */
const queueOptions: QueueOptions = {
  ...getRedisConnectionOptions(),
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times if job fails
    backoff: {
      type: 'exponential',
      delay: 30000, // Wait 30s before first retry, then 1 min, then 2 min
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days (for debugging)
    },
  },
};

/**
 * Create the news generation queue
 * This is used by the API route to add jobs
 */
export const newsQueue = new Queue<NewsJobData>('news-generation', queueOptions);

/**
 * Add a news generation job to the queue
 * Returns job ID immediately
 * Includes retry logic for Upstash free tier timeouts
 */
export async function addNewsJob(data: NewsJobData): Promise<string> {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds between retries

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const job = await newsQueue.add('generate-news', data, {
        // Job-specific options
        jobId: `news-${data.userId}-${Date.now()}`, // Unique ID
      });

      console.log(`✅ News job ${job.id} added to queue (attempt ${attempt})`);
      return job.id!;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isTimeout = error instanceof Error &&
        (error.message.includes('timeout') || error.message.includes('ECONNRESET'));

      if (isTimeout && !isLastAttempt) {
        console.warn(`⚠️  Redis timeout on attempt ${attempt}/${maxRetries}, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      // Either not a timeout error, or last attempt failed
      console.error(`❌ Failed to add news job to queue after ${attempt} attempts:`, error);
      throw error;
    }
  }

  // Should never reach here, but TypeScript needs this
  throw new Error('Failed to add news job to queue after all retry attempts');
}

/**
 * Get job status
 * Used by the status endpoint
 */
export async function getNewsJobStatus(jobId: string) {
  const job = await newsQueue.getJob(jobId);

  if (!job) {
    return { status: 'not_found' };
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    status: state, // 'waiting', 'active', 'completed', 'failed'
    progress: typeof progress === 'number' ? progress : 0,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
  };
}
