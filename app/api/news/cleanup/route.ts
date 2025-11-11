/**
 * News Articles Cleanup API
 * DELETE old articles from the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { deleteOldNewsArticles } from '@/lib/db/news-articles';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const maxAgeDays = body.maxAgeDays || 7;

    console.log(`🧹 Cleaning up articles older than ${maxAgeDays} days`);

    const deletedCount = await deleteOldNewsArticles(maxAgeDays);

    console.log(`✅ Deleted ${deletedCount} old articles`);

    return NextResponse.json({
      success: true,
      deletedCount,
      maxAgeDays
    });

  } catch (error: any) {
    console.error('Cleanup API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup articles',
        message: error.message
      },
      { status: 500 }
    );
  }
}
