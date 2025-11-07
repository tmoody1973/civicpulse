/**
 * Background Podcast Job Processor
 *
 * This endpoint is triggered by the generate-podcast route (fire-and-forget).
 * Processes the actual podcast generation in the background without timing out.
 *
 * Flow:
 * 1. Receive job payload from generate-podcast endpoint
 * 2. Update status to "processing"
 * 3. Execute full audio generation pipeline:
 *    - Fetch bills (20%)
 *    - Generate script (40%)
 *    - Generate audio (60%)
 *    - Upload to Vultr (80%)
 *    - Save metadata (90%)
 * 4. Update status to "complete" with audio URL
 *
 * This simulates what the Raindrop Task worker will do in production.
 * In production, this logic moves to workers/audio-worker.ts and runs on Raindrop.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentBills, fetchBillDetails } from '@/lib/api/congress';
import { generateDialogueScript } from '@/lib/ai/claude';
import { generateDialogue, estimateAudioDuration } from '@/lib/ai/elevenlabs';
import { uploadPodcast } from '@/lib/storage/vultr';

// Allow longer execution time for background job
export const maxDuration = 60; // 60 seconds max for Netlify (will move to Raindrop for no limit)

interface JobPayload {
  jobId: string;
  userId: string;
  type: 'podcast_daily' | 'podcast_weekly';
  params: {
    billCount: number;
    representatives: Array<{ name: string; party: string; state: string }>;
  };
  createdAt: string;
  attempt: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let job: JobPayload | undefined;

  try {
    const body = await request.json();
    job = body as JobPayload;

    console.log(`[Worker] Processing podcast job: ${job.jobId}`);

    // Update status to processing
    await updateJobStatus(job.jobId, {
      status: 'processing',
      progress: 0,
      message: 'Starting podcast generation...',
    });

    // Step 1: Fetch bills (20%)
    await updateJobStatus(job.jobId, {
      status: 'processing',
      progress: 20,
      message: 'Fetching congressional bills...',
    });

    const bills = await fetchRecentBills({ limit: job.params.billCount });

    if (bills.length === 0) {
      throw new Error('No bills available for podcast generation');
    }

    console.log(`[Worker] Fetched ${bills.length} bills`);

    // Fetch detailed summaries
    for (let i = 0; i < bills.length; i++) {
      try {
        const detailed = await fetchBillDetails(
          bills[i].congress,
          bills[i].billType,
          bills[i].billNumber
        );
        bills[i] = { ...bills[i], ...detailed };
      } catch (error) {
        console.warn(`[Worker] Could not fetch details for bill ${i + 1}:`, error);
      }
    }

    // Step 2: Generate dialogue script (40%)
    await updateJobStatus(job.jobId, {
      status: 'processing',
      progress: 40,
      message: 'Generating dialogue script with AI...',
    });

    const type = job.type === 'podcast_daily' ? 'daily' : 'weekly';
    const dialogue = await generateDialogueScript(bills, type);

    if (!dialogue || dialogue.length === 0) {
      throw new Error('Failed to generate dialogue script');
    }

    console.log(`[Worker] Generated dialogue with ${dialogue.length} exchanges`);

    // Step 3: Generate audio (60%)
    await updateJobStatus(job.jobId, {
      status: 'processing',
      progress: 60,
      message: 'Creating audio with ElevenLabs (this takes a minute)...',
    });

    const audioBuffer = await generateDialogue(dialogue);

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Failed to generate audio');
    }

    const audioDuration = estimateAudioDuration(dialogue);
    console.log(`[Worker] Generated ${(audioBuffer.length / 1024).toFixed(2)}KB audio (~${audioDuration}s)`);

    // Step 4: Upload to Vultr (80%)
    await updateJobStatus(job.jobId, {
      status: 'processing',
      progress: 80,
      message: 'Uploading to cloud storage...',
    });

    const audioUrl = await uploadPodcast(audioBuffer, {
      userId: job.userId,
      type,
      duration: audioDuration,
      billsCovered: bills.map((b) => `${b.billType}${b.billNumber}`),
      generatedAt: new Date(),
    });

    console.log(`[Worker] Uploaded audio to ${audioUrl}`);

    // Step 5: Save metadata (90%)
    await updateJobStatus(job.jobId, {
      status: 'processing',
      progress: 90,
      message: 'Saving podcast metadata...',
    });

    const transcript = dialogue.map((d) => `${d.host.toUpperCase()}: ${d.text}`).join('\n\n');

    // Save to database via internal API call
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/podcasts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: job.userId,
        type,
        audioUrl,
        transcript,
        billsCovered: bills.map((b) => ({
          id: `${b.billType}${b.billNumber}`,
          title: b.title,
          sponsor: b.sponsorName,
        })),
        duration: audioDuration,
        generatedAt: new Date(),
      }),
    });

    // Step 6: Cache the generated podcast (for future instant delivery)
    console.log(`[Worker] Caching podcast for future requests...`);
    try {
      const { cachePodcast } = await import('@/lib/podcast/cache');

      await cachePodcast(job.userId, type, {
        audioUrl,
        transcript,
        billsCovered: bills.map((b) => ({
          id: `${b.billType}${b.billNumber}`,
          title: b.title,
          sponsor: b.sponsorName,
        })),
        duration: audioDuration,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      });

      console.log(`✅ Podcast cached - next request will be instant!`);
    } catch (cacheError) {
      console.warn(`Failed to cache podcast (non-fatal):`, cacheError);
    }

    // Step 7: Complete! (100%)
    await updateJobStatus(job.jobId, {
      status: 'complete',
      progress: 100,
      message: 'Your podcast is ready!',
      audioUrl,
      duration: audioDuration,
      completedAt: new Date().toISOString(),
    });

    const latency = Date.now() - startTime;
    console.log(`[Worker] Job ${job.jobId} completed in ${(latency / 1000).toFixed(2)}s`);

    return NextResponse.json({
      success: true,
      jobId: job.jobId,
      latency,
    });

  } catch (error: any) {
    console.error('[Worker] Job processing error:', error);

    // Extract jobId from job if available
    const jobId = job?.jobId;

    if (jobId) {
      await updateJobStatus(jobId, {
        status: 'failed',
        progress: 0,
        message: 'Podcast generation failed',
        error: error.message || 'Unknown error',
      });
    }

    return NextResponse.json(
      {
        error: 'Job processing failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Update job status in KV cache
 */
async function updateJobStatus(
  jobId: string,
  status: {
    status: string;
    progress: number;
    message: string;
    audioUrl?: string;
    duration?: number;
    error?: string;
    completedAt?: string;
  }
): Promise<void> {
  // TODO: Replace with actual Raindrop KV Cache API
  // In production: env.KV_CACHE.put(`job:${jobId}`, JSON.stringify(status), { expirationTtl: 3600 })

  console.log(`[Worker] Status update for ${jobId}:`, {
    status: status.status,
    progress: status.progress,
    message: status.message,
  });

  // For now, just log (in production, this stores in Raindrop KV)
  // The audio-status endpoint will need to read from this same KV cache
}
