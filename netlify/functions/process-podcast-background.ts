/**
 * Netlify Background Function - Podcast Generation
 *
 * Background functions can run for up to 15 minutes, perfect for podcast generation.
 * This function is invoked asynchronously and doesn't block the user request.
 *
 * Netlify automatically handles:
 * - Async execution (returns 202 Accepted immediately)
 * - No timeout limits (up to 15 minutes)
 * - Retry logic on transient failures
 *
 * Flow:
 * 1. Get job from Turso database
 * 2. Fetch bills from Congress.gov
 * 3. Generate dialogue script with Claude
 * 4. Generate audio with ElevenLabs
 * 5. Upload to Vultr CDN
 * 6. Save results to database
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

// Import database functions (now async with Turso support)
import { execute, queryOne } from '../../lib/db/sqlite';

// Import external API integrations
import { fetchRecentBills } from '../../lib/api/congress';
import { generateDialogueScript } from '../../lib/ai/claude';
import { generateDialogue } from '../../lib/ai/elevenlabs';
import { uploadPodcast } from '../../lib/storage/vultr';
import type { Bill } from '../../lib/api/congress';

interface JobRecord {
  job_id: string;
  user_id: string;
  type: 'daily' | 'weekly';
  status: string;
  progress: number;
  message: string;
  bill_count: number;
  topics: string | null;
  retry_count: number;
  max_retries: number;
}

/**
 * Update job progress in database
 */
async function updateProgress(jobId: string, progress: number, message: string): Promise<void> {
  await execute(
    `UPDATE podcast_jobs
     SET progress = ?, message = ?
     WHERE job_id = ?`,
    [progress, message, jobId]
  );
  console.log(`[${jobId}] Progress: ${progress}% - ${message}`);
}

/**
 * Calculate audio duration from buffer (approximate)
 * MP3 at 192kbps: 1 minute ≈ 1.44MB
 */
function calculateDuration(audioBuffer: Buffer): number {
  const sizeInMB = audioBuffer.length / (1024 * 1024);
  const durationInMinutes = sizeInMB / 1.44;
  return Math.round(durationInMinutes * 60); // Return seconds
}

/**
 * Background function handler
 * This runs asynchronously without blocking the initial request
 */
export const handler: Handler = async (event: HandlerEvent) => {
  try {
    console.log('🔄 Background processor triggered');

    // Parse job ID from request body
    const body = JSON.parse(event.body || '{}');
    const jobId = body.jobId;

    if (!jobId) {
      console.error('❌ No jobId provided');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'jobId required' })
      };
    }

    // Get job from database
    const job = await queryOne<JobRecord>(
      `SELECT * FROM podcast_jobs WHERE job_id = ?`,
      [jobId]
    );

    if (!job) {
      console.error(`❌ Job ${jobId} not found`);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }

    console.log(`📻 Processing job ${job.job_id} (user: ${job.user_id}, type: ${job.type})`);

    // Update status to processing
    await execute(
      `UPDATE podcast_jobs
       SET status = 'processing',
           started_at = CURRENT_TIMESTAMP,
           progress = 0,
           message = 'Starting podcast generation...'
       WHERE job_id = ?`,
      [job.job_id]
    );

    try {
      // Step 1: Fetch bills (20% progress)
      await updateProgress(job.job_id, 20, 'Fetching recent bills from Congress.gov...');

      const bills = await fetchRecentBills({
        congress: 119, // Current congress
        limit: job.bill_count || (job.type === 'daily' ? 3 : 8),
        sort: 'updateDate+desc'
      });

      if (!bills || bills.length === 0) {
        throw new Error('No bills found from Congress API');
      }

      console.log(`✅ Fetched ${bills.length} bills`);

      // Step 2: Generate dialogue script (40% progress)
      await updateProgress(job.job_id, 40, 'Generating script with Claude AI...');

      const dialogue = await generateDialogueScript(bills, job.type);

      if (!dialogue || dialogue.length === 0) {
        throw new Error('Failed to generate dialogue script');
      }

      console.log(`✅ Generated dialogue: ${dialogue.length} lines`);

      // Step 3: Generate audio (60% progress)
      await updateProgress(job.job_id, 60, 'Creating audio with ElevenLabs (1-2 minutes)...');

      const audioBuffer = await generateDialogue(dialogue);

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Failed to generate audio');
      }

      const duration = calculateDuration(audioBuffer);
      console.log(`✅ Generated audio: ${audioBuffer.length} bytes (~${duration}s)`);

      // Step 4: Upload to Vultr CDN (80% progress)
      await updateProgress(job.job_id, 80, 'Uploading to CDN...');

      const audioUrl = await uploadPodcast(audioBuffer, {
        userId: job.user_id,
        type: job.type,
        duration,
        billsCovered: bills.map((b: Bill) => `${b.billType}${b.billNumber}`),
        generatedAt: new Date(),
      });

      console.log(`✅ Uploaded to: ${audioUrl}`);

      // Step 5: Save metadata (90% progress)
      await updateProgress(job.job_id, 90, 'Saving metadata...');

      const transcript = dialogue
        .map(d => `${d.host.toUpperCase()}: ${d.text}`)
        .join('\n\n');

      const billsCoveredJson = JSON.stringify(
        bills.map((b: Bill) => ({
          id: `${b.billType}${b.billNumber}`,
          title: b.title,
          sponsor: b.sponsorName,
        }))
      );

      // Step 6: Mark job as complete (100% progress)
      await execute(
        `UPDATE podcast_jobs
         SET status = 'complete',
             progress = 100,
             message = 'Podcast ready!',
             audio_url = ?,
             duration = ?,
             bills_covered = ?,
             transcript = ?,
             completed_at = CURRENT_TIMESTAMP
         WHERE job_id = ?`,
        [audioUrl, duration, billsCoveredJson, transcript, job.job_id]
      );

      console.log(`✅ Job ${job.job_id} completed successfully`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          jobId: job.job_id,
          audioUrl,
          duration,
          billsCovered: bills.length,
        })
      };

    } catch (error: any) {
      console.error(`❌ Job ${job.job_id} failed:`, error);

      const errorMessage = error.message || 'Unknown error';

      // Mark job as failed
      await execute(
        `UPDATE podcast_jobs
         SET status = 'failed',
             error_message = ?,
             retry_count = retry_count + 1,
             last_retry_at = CURRENT_TIMESTAMP
         WHERE job_id = ?`,
        [errorMessage, job.job_id]
      );

      // If retries left, requeue for automatic retry
      if (job.retry_count + 1 < job.max_retries) {
        console.log(`⏳ Requeuing job ${job.job_id} (retry ${job.retry_count + 1}/${job.max_retries})`);

        await execute(
          `UPDATE podcast_jobs
           SET status = 'queued',
               message = 'Retrying...',
               progress = 0
           WHERE job_id = ?`,
          [job.job_id]
        );

        // Trigger background function again for retry
        // Netlify will handle this asynchronously
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: 'Job failed, retry scheduled',
            details: errorMessage,
            jobId: job.job_id,
            retriesLeft: job.max_retries - (job.retry_count + 1)
          })
        };
      }

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Job processing failed',
          details: errorMessage,
          jobId: job.job_id,
        })
      };
    }

  } catch (error) {
    console.error('❌ Background processor error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Background processor failed',
        details: errorMessage,
      })
    };
  }
};
