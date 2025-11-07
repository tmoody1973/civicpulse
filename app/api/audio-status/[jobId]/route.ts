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

    // Fetch job status from KV cache
    // TODO: Replace with actual Raindrop KV Cache API
    // For now, we'll check a mock storage
    let jobStatus;
    try {
      // In production, this would be: env.KV_CACHE.get(`job:${jobId}`)
      // For now, we'll return a mock status
      console.log(`🔍 Fetching job status from KV cache: job:${jobId}`);

      // Mock status for development
      jobStatus = {
        jobId,
        status: 'processing',
        progress: 40,
        message: 'Generating dialogue script with AI...',
      };
    } catch (error) {
      console.error('Failed to fetch job status:', error);
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...jobStatus,
    });

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
