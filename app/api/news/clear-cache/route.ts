import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/client';

/**
 * DEV ONLY: Clear news articles cache
 * DELETE /api/news/clear-cache
 */
export async function DELETE() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Cache clearing not available in production' },
      { status: 403 }
    );
  }

  try {
    // Delete all news articles
    await executeQuery('DELETE FROM news_articles', 'users');

    console.log('✅ Cleared news_articles cache');

    return NextResponse.json({
      success: true,
      message: 'News articles cache cleared. Next fetch will get fresh articles with og:images.',
    });
  } catch (error: any) {
    console.error('Failed to clear cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache', details: error.message },
      { status: 500 }
    );
  }
}
