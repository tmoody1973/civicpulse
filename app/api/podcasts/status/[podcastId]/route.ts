/**
 * GET /api/podcasts/status/[podcastId]
 *
 * Get status of a specific podcast
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ podcastId: string }> }
) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { podcastId } = await params;

    // TODO: Once Raindrop is deployed, use actual actor
    // For now, return mock status
    return NextResponse.json({
      podcastId,
      status: 'queued',
      queuePosition: 1,
      message: 'Podcast is queued for generation'
    });

    /* UNCOMMENT WHEN RAINDROP IS DEPLOYED:

    // Get user's podcast generator actor
    const actorId = env.PODCAST_GENERATOR.idFromName(session.user.id);
    const actor = env.PODCAST_GENERATOR.get(actorId);

    // Get status
    const status = await actor.getStatus(podcastId);

    if (!status) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(status);
    */

  } catch (error: any) {
    console.error('[API] Get status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/podcasts/status/[podcastId]
 *
 * Cancel a queued podcast
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ podcastId: string }> }
) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { podcastId } = await params;

    // TODO: Once Raindrop is deployed, use actual actor
    // For now, return mock success
    return NextResponse.json({
      success: true,
      cancelled: true,
      message: 'Podcast cancelled'
    });

    /* UNCOMMENT WHEN RAINDROP IS DEPLOYED:

    // Get user's podcast generator actor
    const actorId = env.PODCAST_GENERATOR.idFromName(session.user.id);
    const actor = env.PODCAST_GENERATOR.get(actorId);

    // Try to cancel
    const cancelled = await actor.cancel(podcastId);

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Podcast not found or already processing' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      cancelled: true,
      message: 'Podcast cancelled successfully'
    });
    */

  } catch (error: any) {
    console.error('[API] Cancel podcast error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel podcast', details: error.message },
      { status: 500 }
    );
  }
}
