/**
 * Audio Job Status API Route
 *
 * Allows users to check the status of their audio generation jobs.
 * Polls this endpoint every 3 seconds to get real-time progress updates.
 *
 * Returns:
 * - status: 'queued' | 'processing' | 'complete' | 'failed'
 * - progress: 0-100 (percentage)
 * - message: Human-readable status message
 * - audioUrl: Present when status is 'complete'
 * - error: Present when status is 'failed'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Get authenticated user
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if this is a test user job - return mock completion
    if (jobId.startsWith('test_job_')) {
      console.log(`🧪 Test job status check: ${jobId}`);

      // Simulate progressive status for test jobs
      // Use timestamp in jobId to determine which status to return
      const mockStatuses = [
        {
          jobId,
          status: 'processing',
          progress: 60,
          message: 'Generating audio with ElevenLabs...',
        },
        {
          jobId,
          status: 'complete',
          progress: 100,
          message: 'Your podcast is ready!',
          audioUrl: `https://mock-cdn.hakivo.com/test-podcast-${jobId}.mp3`,
          duration: 318, // 5 minutes 18 seconds
          completedAt: new Date().toISOString(),
        },
      ];

      // Return "complete" status for test jobs (instant mock)
      return NextResponse.json({
        success: true,
        ...mockStatuses[1],
        testMode: true,
      });
    }

    console.log(`📊 Checking status for job: ${jobId}`);

    // Verify job belongs to user (extract userId from jobId)
    const jobUserId = jobId.split('-')[0];
    if (jobUserId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - job does not belong to you' },
        { status: 403 }
      );
    }

    // Query job status from database (fallback due to Raindrop Service binding bug)
    console.log(`🔍 Querying database for job: ${jobId}`);

    try {
      const { queryOne } = await import('@/lib/db/sqlite');

      const job = queryOne<any>(
        `SELECT * FROM podcast_jobs WHERE job_id = ?`,
        [jobId]
      );

      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      console.log(`✅ Job status retrieved:`, {
        status: job.status,
        progress: job.progress,
        message: job.message
      });

      return NextResponse.json({
        success: true,
        jobId: job.job_id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        audioUrl: job.audio_url,
        duration: job.duration,
        billsCovered: job.bills_covered ? JSON.parse(job.bills_covered) : null,
        transcript: job.transcript,
        error: job.error_message,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
      });

    } catch (dbError: any) {
      console.error('❌ Failed to query job from database:', dbError);
      return NextResponse.json(
        { error: 'Failed to retrieve job status', details: dbError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error fetching job status:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch job status',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
