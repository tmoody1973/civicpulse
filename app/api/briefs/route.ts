import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/client';
import { getSession } from '@/lib/auth/session';

/**
 * Extract first image URL from markdown content
 */
function extractImageFromMarkdown(markdown: string): string | null {
  const imageMatch = markdown?.match(/!\[.*?\]\((.*?)\)/);
  return imageMatch && imageMatch[1] ? imageMatch[1] : null;
}

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
        audio_url, duration, policy_areas, generated_at,
        headline, excerpt, category, author, written_digest
      FROM briefs
      ${whereClause}
      ORDER BY generated_at DESC
      LIMIT 50`,
      'users'
    );

    // Parse JSON fields and extract images from markdown
    const briefs = result.rows.map((row: any) => {
      // Priority: featured_image_url > extract from markdown
      const featuredImage = row.featured_image_url ||
                           extractImageFromMarkdown(row.written_digest);

      return {
        ...row,
        featured_image_url: featuredImage,
        policy_areas: row.policy_areas ? JSON.parse(row.policy_areas) : [],
        bills_covered: row.bills_covered ? JSON.parse(row.bills_covered) : [],
        news_articles: row.news_articles ? JSON.parse(row.news_articles) : [],
        // Don't send full written_digest to client (can be large)
        written_digest: undefined,
      };
    });

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

/**
 * POST /api/briefs - Create a new brief
 * Called by Inngest function after generating audio
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      briefId,
      userId,
      audioUrl,
      writtenDigest,
      featureImageUrl,
      policyAreas,
      duration,
      headline,
      title
    } = body;

    // Validate required fields
    if (!briefId || !userId || !audioUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: briefId, userId, audioUrl' },
        { status: 400 }
      );
    }

    console.log(`💾 Saving brief to database: ${briefId}`);

    // Escape values for SQL
    const escapeSQL = (val: any) => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val.toString();
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // Insert brief into database with featured image, headline, and title
    const result = await executeQuery(
      `INSERT INTO briefs (
        id, user_id, type, audio_url, transcript,
        written_digest, policy_areas, bills_covered, duration,
        featured_image_url, headline, title
      ) VALUES (
        ${escapeSQL(briefId)},
        ${escapeSQL(userId)},
        ${escapeSQL('daily')},
        ${escapeSQL(audioUrl)},
        ${escapeSQL(JSON.stringify({ status: 'generated' }))},
        ${escapeSQL(writtenDigest || '')},
        ${escapeSQL(JSON.stringify(policyAreas || []))},
        ${escapeSQL(JSON.stringify([]))},
        ${duration || 300},
        ${escapeSQL(featureImageUrl || null)},
        ${escapeSQL(headline || 'Daily Civic Brief')},
        ${escapeSQL(title || new Date().toLocaleDateString())}
      )`,
      'users'
    );

    console.log(`✅ Brief saved successfully: ${briefId}`);

    return NextResponse.json({
      success: true,
      briefId,
      message: 'Brief saved successfully'
    });

  } catch (error: any) {
    console.error('❌ Error saving brief:', error);
    return NextResponse.json(
      {
        error: 'Failed to save brief',
        message: error.message
      },
      { status: 500 }
    );
  }
}
