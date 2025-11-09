/**
 * News Generation Queue (Raindrop Platform)
 *
 * This queue handles background fetching of personalized news using Raindrop workers.
 *
 * Flow:
 * 1. API route adds job to Raindrop queue (returns immediately with job ID)
 * 2. Raindrop Observer picks up job from queue (runs in background)
 * 3. Observer processes job (fetches news, enriches with images - takes 20-30s, NO TIMEOUT)
 * 4. Observer updates database with result
 * 5. Frontend polls database for completion
 *
 * Benefits over BullMQ:
 * - No Redis timeouts (Raindrop Queue is built-in)
 * - No execution time limits (Observers can run indefinitely)
 * - Automatic retries with backoff
 * - 100% Raindrop Platform (hackathon compliant)
 */

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
 * Add a news generation job to the Raindrop queue
 * Returns job ID immediately
 *
 * This sends the job to the Raindrop worker application deployed at raindrop-workers/
 * The Observer will process it with NO timeout constraints.
 */
export async function addNewsJob(data: NewsJobData): Promise<string> {
  const jobId = `news-${data.userId}-${Date.now()}`;

  console.log(`📰 Queueing news generation job ${jobId} to Raindrop worker`);

  try {
    // Send job to Raindrop queue via HTTP API
    // The Raindrop worker application must be deployed first with: raindrop build deploy
    const raindropApiUrl = process.env.RAINDROP_API_URL || 'https://api.raindrop.ai/v1';
    const raindropApiKey = process.env.RAINDROP_API_KEY;

    if (!raindropApiKey) {
      throw new Error('RAINDROP_API_KEY environment variable not set');
    }

    const response = await fetch(`${raindropApiUrl}/queue/news-queue/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${raindropApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        jobId, // Include job ID for tracking
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Raindrop queue API error: ${response.status} ${errorText}`);
    }

    console.log(`✅ News job ${jobId} queued to Raindrop worker`);
    console.log(`   Observer will process with NO timeout (typically 20-30 seconds)`);

    return jobId;

  } catch (error) {
    console.error(`❌ Failed to queue news job to Raindrop:`, error);
    throw error;
  }
}

/**
 * Get job status from database
 *
 * Since Raindrop Observers update the database directly, we check the personalized_news_cache table
 * instead of querying a job queue.
 */
export async function getNewsJobStatus(jobId: string) {
  try {
    // Extract userId from jobId format: news-{userId}-{timestamp}
    const [, userId] = jobId.split('-');

    if (!userId) {
      return { status: 'not_found' };
    }

    // Check if news was generated (check cache)
    const { getCachedNews } = await import('@/lib/news/cache');

    // Try to get cached news (any interests - just checking if data exists)
    const cached = await getCachedNews(userId, ['Politics'], 1); // Minimal query

    if (cached && cached.length > 0) {
      return {
        status: 'completed',
        progress: 100,
        result: {
          articlesCount: cached.length,
        },
      };
    }

    // News not yet generated - assume still processing
    return {
      status: 'active',
      progress: 50,
      message: 'News generation in progress (typically 20-30 seconds)',
    };

  } catch (error) {
    console.error('Error checking news job status:', error);
    return {
      status: 'failed',
      failedReason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
