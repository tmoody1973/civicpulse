import { requireAdmin } from "@/lib/auth/session";
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { executeQuery } from '@/lib/db/client';

/**
 * GET /api/admin/briefs
 * Fetch all briefs from the database for admin view
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    // Check authentication
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get limit and offset from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Query briefs table
    const result = await executeQuery(
      `SELECT
        id,
        user_id,
        type,
        audio_url,
        duration,
        policy_areas,
        generated_at,
        LENGTH(transcript) as transcript_length,
        LENGTH(written_digest) as digest_length,
        LENGTH(news_articles) as news_count,
        LENGTH(bills_covered) as bills_count
      FROM briefs
      ORDER BY generated_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
      'users'
    );

    return NextResponse.json({
      rows: result.rows || [],
      count: result.rows?.length || 0,
    });

  } catch (error) {
    console.error('Error fetching briefs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch briefs' },
      { status: 500 }
    );
  }
}
