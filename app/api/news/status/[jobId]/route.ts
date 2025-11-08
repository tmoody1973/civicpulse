import { NextRequest, NextResponse } from 'next/server';
import { getNewsJobStatus } from '@/lib/queue/news-queue';

/**
 * GET /api/news/status/[jobId]
 * Get the status of a news generation job
 *
 * Returns:
 * - status: 'waiting' | 'active' | 'completed' | 'failed' | 'not_found'
 * - progress: 0-100 (percentage)
 * - result: {articles, topicImages, processingTime} (when completed)
 * - failedReason: error message (when failed)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    console.log(`📊 Checking status for news job ${jobId}`);

    const jobStatus = await getNewsJobStatus(jobId);

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
