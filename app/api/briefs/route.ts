import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/client';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    // Get authenticated user (optional for development)
    const user = await getSession();

    // For development: if no user, show all briefs
    // In production, this should require authentication
    const whereClause = user ? `WHERE user_id = '${user.id}'` : '';

    // Fetch user's briefs from database
    const result = await executeQuery(
      `SELECT
        id, user_id, type, title, featured_image_url,
        audio_url, duration, policy_areas, generated_at
      FROM briefs
      ${whereClause}
      ORDER BY generated_at DESC
      LIMIT 50`,
      'users'
    );

    // Parse JSON fields from database
    const briefs = result.rows.map((row: any) => ({
      ...row,
      policy_areas: row.policy_areas ? JSON.parse(row.policy_areas) : [],
      bills_covered: row.bills_covered ? JSON.parse(row.bills_covered) : [],
      news_articles: row.news_articles ? JSON.parse(row.news_articles) : [],
    }));

    return NextResponse.json({
      success: true,
      briefs,
    });

  } catch (error) {
    console.error('Error fetching briefs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch briefs' },
      { status: 500 }
    );
  }
}
