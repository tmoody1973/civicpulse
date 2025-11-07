import { NextRequest, NextResponse } from 'next/server';
import { getBriefJobStatus } from '@/lib/queue/brief-queue';

/**
 * GET /api/briefs/status/[jobId]
 * Get the status of a brief generation job
 *
 * Returns:
 * - status: 'waiting' | 'active' | 'completed' | 'failed' | 'not_found'
 * - progress: 0-100 (percentage)
 * - result: {audioUrl, duration, billsCovered} (when completed)
 * - failedReason: error message (when failed)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    console.log(`📊 Checking status for job ${jobId}`);

    const jobStatus = await getBriefJobStatus(jobId);

    return NextResponse.json({
      success: true,
      jobId,
      ...jobStatus,
    });

  } catch (error) {
    console.error('❌ Job status check error:', error);

    return NextResponse.json(
      {
        error: 'Failed to check job status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
