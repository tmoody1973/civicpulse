/**
 * POST /api/podcasts/queue
 *
 * Queue a new podcast generation request
 * Returns queue position and estimated time
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { type, bills } = await req.json();

    // Validate input
    if (!type || !['daily', 'weekly'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid podcast type. Must be "daily" or "weekly".' },
        { status: 400 }
      );
    }

    if (!Array.isArray(bills) || bills.length === 0) {
      return NextResponse.json(
        { error: 'Bills array is required and must not be empty.' },
        { status: 400 }
      );
    }

    // TODO: Once Raindrop is deployed, use actual actor
    // For now, return mock response
    const mockResponse = {
      success: true,
      queued: true,
      podcastId: `podcast-mock-${Date.now()}`,
      queuePosition: 1,
      estimatedTime: {
        seconds: 45,
        humanReadable: '~1 minute'
      },
      message: 'Generating your podcast now...'
    };

    return NextResponse.json(mockResponse);

    /* UNCOMMENT WHEN RAINDROP IS DEPLOYED:

    // Get user's podcast generator actor
    const actorId = env.PODCAST_GENERATOR.idFromName(session.user.id);
    const actor = env.PODCAST_GENERATOR.get(actorId);

    // Queue the podcast
    const result = await actor.queuePodcast({
      type,
      bills,
      userId: session.user.id
    });

    // Calculate human-readable time
    const estimatedMinutes = Math.ceil(result.estimatedSeconds / 60);

    return NextResponse.json({
      success: true,
      queued: true,
      podcastId: result.podcastId,
      queuePosition: result.queuePosition,
      estimatedTime: {
        seconds: result.estimatedSeconds,
        humanReadable: `~${estimatedMinutes} minute${estimatedMinutes > 1 ? 's' : ''}`
      },
      message: result.queuePosition === 1
        ? 'Generating your podcast now...'
        : `Queued! Position #${result.queuePosition}`
    });
    */

  } catch (error: any) {
    console.error('[API] Podcast queue error:', error);
    return NextResponse.json(
      { error: 'Failed to queue podcast', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/podcasts/queue
 *
 * Get user's current podcast queue
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Once Raindrop is deployed, use actual actor
    // For now, return empty queue
    return NextResponse.json({
      queue: [],
      stats: {
        queueLength: 0,
        totalGenerated: 0,
        successRate: 100
      }
    });

    /* UNCOMMENT WHEN RAINDROP IS DEPLOYED:

    // Get user's podcast generator actor
    const actorId = env.PODCAST_GENERATOR.idFromName(session.user.id);
    const actor = env.PODCAST_GENERATOR.get(actorId);

    // Get queue and stats
    const [queue, stats] = await Promise.all([
      actor.getQueue(),
      actor.getStats()
    ]);

    return NextResponse.json({
      queue,
      stats
    });
    */

  } catch (error: any) {
    console.error('[API] Get queue error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue', details: error.message },
      { status: 500 }
    );
  }
}
