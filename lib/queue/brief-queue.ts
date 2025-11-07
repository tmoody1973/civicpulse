/**
 * Brief Generation Queue
 *
 * This queue handles background generation of daily and weekly briefs.
 *
 * Flow:
 * 1. API route adds job to queue (returns immediately with job ID)
 * 2. Worker picks up job from queue (runs in background)
 * 3. Worker processes job (generates brief - takes 5-10 minutes)
 * 4. Worker updates database with result
 * 5. Frontend polls for completion
 */

import { Queue, QueueOptions } from 'bullmq';
import { getRedisConnectionOptions } from './redis';

/**
 * Job data structure
 * This is what we pass when adding a job to the queue
 */
export interface BriefJobData {
  userId: string;
  userEmail: string;
  forceRegenerate?: boolean;
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
      delay: 60000, // Wait 1 minute before first retry, then 2 min, then 4 min
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
 * Create the brief generation queue
 * This is used by the API route to add jobs
 */
export const briefQueue = new Queue<BriefJobData>('brief-generation', queueOptions);

/**
 * Add a brief generation job to the queue
 * Returns job ID immediately
 * Includes retry logic for Upstash free tier timeouts
 */
export async function addBriefJob(data: BriefJobData): Promise<string> {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds between retries

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const job = await briefQueue.add('generate-brief', data, {
        // Job-specific options
        jobId: `brief-${data.userId}-${Date.now()}`, // Unique ID
      });

      console.log(`✅ Job ${job.id} added to queue (attempt ${attempt})`);
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
      console.error(`❌ Failed to add job to queue after ${attempt} attempts:`, error);
      throw error;
    }
  }

  // Should never reach here, but TypeScript needs this
  throw new Error('Failed to add job to queue after all retry attempts');
}

/**
 * Get job status
 * Used by the status endpoint
 */
export async function getBriefJobStatus(jobId: string) {
  const job = await briefQueue.getJob(jobId);

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
