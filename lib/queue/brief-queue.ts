/**
 * Brief Generation Queue (Raindrop Platform)
 *
 * This queue handles background generation of daily and weekly briefs using Raindrop workers.
 *
 * Flow:
 * 1. API route adds job to Raindrop queue (returns immediately with job ID)
 * 2. Raindrop Observer picks up job from queue (runs in background)
 * 3. Observer processes job (generates brief - takes 5-10 minutes, NO TIMEOUT)
 * 4. Observer updates database with result
 * 5. Frontend polls database for completion
 *
 * Benefits over BullMQ:
 * - No Redis timeouts (Raindrop Queue is built-in)
 * - No execution time limits (Observers can run 5-10 min+)
 * - Automatic retries with backoff
 * - 100% Raindrop Platform (hackathon compliant)
 */

/**
 * Job data structure
 * This is what we pass when adding a job to the queue
 */
export interface BriefJobData {
  userId: string;
  userEmail: string;
  userName?: string | null;
  state?: string | null;
  district?: string | null;
  policyInterests: string[];
  forceRegenerate: boolean;
}

/**
 * Add a brief generation job to the Raindrop queue
 * Returns job ID immediately
 *
 * This sends the job to the Raindrop worker application deployed at raindrop-workers/
 * The Observer will process it with NO timeout constraints.
 */
export async function addBriefJob(data: BriefJobData): Promise<string> {
  const jobId = `brief-${data.userId}-${Date.now()}`;

  console.log(`📝 Queueing brief generation job ${jobId} to Raindrop worker`);

  try {
    // Send job to Raindrop queue via HTTP API
    // The Raindrop worker application must be deployed first with: raindrop build deploy
    const raindropApiUrl = process.env.RAINDROP_API_URL || 'https://api.raindrop.ai/v1';
    const raindropApiKey = process.env.RAINDROP_API_KEY;

    if (!raindropApiKey) {
      throw new Error('RAINDROP_API_KEY environment variable not set');
    }

    const response = await fetch(`${raindropApiUrl}/queue/brief-queue/send`, {
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

    console.log(`✅ Brief job ${jobId} queued to Raindrop worker`);
    console.log(`   Observer will process with NO timeout (can take 5-10 minutes)`);

    return jobId;

  } catch (error) {
    console.error(`❌ Failed to queue brief job to Raindrop:`, error);
    throw error;
  }
}

/**
 * Get job status from database
 *
 * Since Raindrop Observers update the database directly, we check the briefs table
 * instead of querying a job queue.
 */
export async function getBriefJobStatus(jobId: string) {
  try {
    // Extract userId from jobId format: brief-{userId}-{timestamp}
    const [, userId] = jobId.split('-');

    if (!userId) {
      return { status: 'not_found' };
    }

    // Check if brief was generated (check database)
    const { executeQuery } = await import('@/lib/db/client');
    const result = await executeQuery(
      `SELECT id, audio_url, generated_at FROM briefs
       WHERE user_id = '${userId.replace(/'/g, "''")}'
       AND DATE(generated_at) = DATE('now')
       ORDER BY generated_at DESC
       LIMIT 1`,
      'users'
    );

    if (result.rows && result.rows.length > 0) {
      return {
        status: 'completed',
        progress: 100,
        result: {
          briefId: result.rows[0].id,
          audioUrl: result.rows[0].audio_url,
        },
      };
    }

    // Brief not yet generated - assume still processing
    return {
      status: 'active',
      progress: 50,
      message: 'Brief generation in progress (may take 5-10 minutes)',
    };

  } catch (error) {
    console.error('Error checking brief job status:', error);
    return {
      status: 'failed',
      failedReason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
