/**
 * Background Job Processor for Podcast Generation
 *
 * Processes podcast generation jobs from the database queue.
 * Triggered by fire-and-forget HTTP request from generate-podcast route.
 *
 * Flow:
 * 1. Get next queued job from database (FIFO)
 * 2. Update status to "processing"
 * 3. Execute full podcast pipeline with progress updates
 * 4. Mark job as complete with results OR failed with error
 * 5. Implement retry logic for transient failures
 *
 * Security: Internal API key authentication required
 */

import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db/sqlite';
import { fetchRecentBills } from '@/lib/api/congress';
import { generateDialogueScript } from '@/lib/ai/claude';
import { generateDialogue } from '@/lib/ai/elevenlabs';
import { uploadPodcast } from '@/lib/storage/vultr';
import type { Bill } from '@/lib/api/congress';

export const maxDuration = 300; // 5 minutes max execution time (Netlify limit)

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
function updateProgress(jobId: string, progress: number, message: string): void {
  execute(
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

export async function POST(request: NextRequest) {
  try {
    // Verify internal API key
    const internalKey = request.headers.get('x-internal-key');
    if (internalKey !== process.env.INTERNAL_API_KEY) {
      console.error('❌ Unauthorized processor access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Background processor triggered');

    // Get next queued job (FIFO with retry logic)
    const job = queryOne<JobRecord>(
      `SELECT * FROM podcast_jobs
       WHERE status = 'queued'
         AND (retry_count < max_retries OR retry_count IS NULL)
       ORDER BY created_at ASC
       LIMIT 1`
    );

    if (!job) {
      console.log('✅ No jobs in queue');
      return NextResponse.json({ message: 'No jobs to process' });
    }

    console.log(`📻 Processing job ${job.job_id} (user: ${job.user_id}, type: ${job.type})`);

    // Update status to processing
    execute(
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
      updateProgress(job.job_id, 20, 'Fetching recent bills from Congress.gov...');

      const bills = await fetchRecentBills({
        congress: 119, // Current congress
        limit: job.bill_count || (job.type === 'daily' ? 3 : 1),
        sort: 'updateDate+desc'
      });

      if (!bills || bills.length === 0) {
        throw new Error('No bills found from Congress API');
      }

      console.log(`✅ Fetched ${bills.length} bills`);

      // Step 2: Generate dialogue script (40% progress)
      updateProgress(job.job_id, 40, 'Generating script with Claude AI...');

      const dialogue = await generateDialogueScript(bills, job.type);

      if (!dialogue || dialogue.length === 0) {
        throw new Error('Failed to generate dialogue script');
      }

      console.log(`✅ Generated dialogue: ${dialogue.length} lines`);

      // Step 3: Generate audio (60% progress)
      updateProgress(job.job_id, 60, 'Creating audio with ElevenLabs (1-2 minutes)...');

      const audioBuffer = await generateDialogue(dialogue);

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Failed to generate audio');
      }

      const duration = calculateDuration(audioBuffer);
      console.log(`✅ Generated audio: ${audioBuffer.length} bytes (~${duration}s)`);

      // Step 4: Upload to Vultr CDN (80% progress)
      updateProgress(job.job_id, 80, 'Uploading to CDN...');

      const audioUrl = await uploadPodcast(audioBuffer, {
        userId: job.user_id,
        type: job.type,
        duration,
        billsCovered: bills.map((b: Bill) => `${b.billType}${b.billNumber}`),
        generatedAt: new Date(),
      });

      console.log(`✅ Uploaded to: ${audioUrl}`);

      // Step 5: Save metadata (90% progress)
      updateProgress(job.job_id, 90, 'Saving metadata...');

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
      execute(
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

      return NextResponse.json({
        success: true,
        jobId: job.job_id,
        audioUrl,
        duration,
        billsCovered: bills.length,
      });

    } catch (error: any) {
      console.error(`❌ Job ${job.job_id} failed:`, error);

      const errorMessage = error.message || 'Unknown error';

      // Mark job as failed
      execute(
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

        execute(
          `UPDATE podcast_jobs
           SET status = 'queued',
               message = 'Retrying...',
               progress = 0
           WHERE job_id = ?`,
          [job.job_id]
        );

        // Trigger processor again after delay (fire-and-forget)
        setTimeout(() => {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/process-podcast-queue`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-key': process.env.INTERNAL_API_KEY || 'dev-key'
            },
          }).catch(err => console.error('Retry trigger failed:', err));
        }, 5000); // 5 second delay before retry
      }

      return NextResponse.json(
        {
          error: 'Job processing failed',
          details: errorMessage,
          jobId: job.job_id,
          retriesLeft: job.max_retries - (job.retry_count + 1)
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Processor error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Background processor failed',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check processor status
export async function GET() {
  try {
    // Count jobs by status
    const { queryOne } = await import('@/lib/db/sqlite');

    const stats = {
      queued: queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM podcast_jobs WHERE status = 'queued'`
      )?.count || 0,
      processing: queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM podcast_jobs WHERE status = 'processing'`
      )?.count || 0,
      complete: queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM podcast_jobs WHERE status = 'complete'`
      )?.count || 0,
      failed: queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM podcast_jobs WHERE status = 'failed'`
      )?.count || 0,
    };

    return NextResponse.json({
      service: 'Podcast Queue Processor',
      status: 'online',
      queue: stats,
      note: 'Use POST with x-internal-key header to trigger processing',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch queue stats' },
      { status: 500 }
    );
  }
}
