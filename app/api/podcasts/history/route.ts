/**
 * GET /api/podcasts/history
 *
 * Get user's podcast generation history (last 10)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

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
    // For now, return empty history
    return NextResponse.json({
      history: [],
      latest: null
    });

    /* UNCOMMENT WHEN RAINDROP IS DEPLOYED:

    // Get user's podcast generator actor
    const actorId = env.PODCAST_GENERATOR.idFromName(session.user.id);
    const actor = env.PODCAST_GENERATOR.get(actorId);

    // Get history and latest
    const [history, latest] = await Promise.all([
      actor.getHistory(),
      actor.getLatest()
    ]);

    return NextResponse.json({
      history,
      latest
    });
    */

  } catch (error: any) {
    console.error('[API] Get history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/podcasts/history
 *
 * Clear user's podcast history
 */
export async function DELETE(req: NextRequest) {
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
    // For now, return success
    return NextResponse.json({
      success: true,
      message: 'History cleared'
    });

    /* UNCOMMENT WHEN RAINDROP IS DEPLOYED:

    // Get user's podcast generator actor
    const actorId = env.PODCAST_GENERATOR.idFromName(session.user.id);
    const actor = env.PODCAST_GENERATOR.get(actorId);

    // Clear history
    await actor.clearHistory();

    return NextResponse.json({
      success: true,
      message: 'History cleared successfully'
    });
    */

  } catch (error: any) {
    console.error('[API] Clear history error:', error);
    return NextResponse.json(
      { error: 'Failed to clear history', details: error.message },
      { status: 500 }
    );
  }
}
