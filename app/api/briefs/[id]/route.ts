import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/client';
import { getSession } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user (optional for development)
    const user = await getSession();

    const { id } = await params;

    // For development: if no user, allow viewing any brief
    // In production, this should require authentication and user ownership check
    const whereClause = user
      ? `WHERE id = '${id}' AND user_id = '${user.id}'`
      : `WHERE id = '${id}'`;

    // Fetch brief from database
    const result = await executeQuery(
      `SELECT
        id, user_id, type, title, featured_image_url,
        audio_url, transcript, written_digest, duration,
        policy_areas, news_articles, bills_covered, generated_at
      FROM briefs
      ${whereClause}
      LIMIT 1`,
      'users'
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Brief not found' },
        { status: 404 }
      );
    }

    const brief = result.rows[0];

    // Parse JSON fields
    const parsedBrief = {
      ...brief,
      policy_areas: brief.policy_areas ? JSON.parse(brief.policy_areas) : [],
      news_articles: brief.news_articles ? JSON.parse(brief.news_articles) : [],
      bills_covered: brief.bills_covered ? JSON.parse(brief.bills_covered) : [],
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
