import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { executeQuery } from '@/lib/db/client';

/**
 * GET /api/briefs/[id]
 * Fetch a specific brief by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch brief from database
    const result = await executeQuery(
      `SELECT * FROM briefs WHERE id = '${id}' AND user_id = '${user.id}' LIMIT 1`,
      'users'
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Brief not found' },
        { status: 404 }
      );
    }

    const brief = result.rows[0];

    // Parse JSON fields
    const parsedBrief = {
      id: brief.id,
      title: brief.title || 'Daily Legislative Brief',
      audio_url: brief.audio_url,
      written_digest: brief.written_digest,
      featured_image_url: brief.featured_image_url,
      duration: brief.duration,
      type: brief.type,
      policy_areas: brief.policy_areas ? JSON.parse(brief.policy_areas) : [],
      news_count: brief.news_articles ? JSON.parse(brief.news_articles).length : 0,
      bill_count: brief.bills_covered ? JSON.parse(brief.bills_covered).length : 0,
      generated_at: brief.generated_at,
      transcript: brief.transcript,
    };

    return NextResponse.json({
      success: true,
      brief: parsedBrief,
    });

  } catch (error) {
    console.error('Error fetching brief:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brief' },
      { status: 500 }
    );
  }
}
