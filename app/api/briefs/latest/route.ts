import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

/**
 * Get the latest daily brief with all details for dashboard display
 * Filtered by authenticated user
 */
export async function GET() {
  try {
    // Get authenticated user
    const user = await getSession();

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Not authenticated'
      }, { status: 401 });
    }

    const raindropServiceUrl = process.env.RAINDROP_SERVICE_URL || 'https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run';

    console.log(`🔍 Fetching latest brief for user ${user.id} from Raindrop service...`);

    // Fetch the most recent brief from Raindrop SQL FOR THIS USER
    const query = `
      SELECT
        id,
        user_id,
        type,
        audio_url,
        written_digest,
        policy_areas,
        duration,
        generated_at,
        featured_image_url,
        headline,
        title
      FROM briefs
      WHERE user_id = '${user.id}'
      AND type = 'daily'
      ORDER BY generated_at DESC
      LIMIT 1
    `;

    const response = await fetch(`${raindropServiceUrl}/api/admin/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table: 'users', // WORKAROUND: Use users table to execute query on briefs
        query,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Raindrop service error: ${response.status} - ${errorText}`);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch brief from database'
      }, { status: 500 });
    }

    const result = await response.json();
    const rows = result.rows || [];

    if (rows.length === 0) {
      console.log('ℹ️  No briefs found in database');
      return NextResponse.json({
        success: false,
        message: 'No briefs available yet. Generate your first brief!'
      });
    }

    const briefRow = rows[0];
    console.log(`✅ Found brief: ${briefRow.id} for user ${user.id}`);

    // Parse JSON fields
    const policyAreas = briefRow.policy_areas ? JSON.parse(briefRow.policy_areas) : [];

    // Extract bills and news from written digest
    // In a real implementation, these would be stored in separate tables
    // For now, we'll parse them from the markdown or return mock data
    const billsCovered = extractBillsFromDigest(briefRow.written_digest);
    const newsArticles = extractNewsFromDigest(briefRow.written_digest);

    // Format the response
    const briefData = {
      briefId: briefRow.id,
      userId: briefRow.user_id,
      type: briefRow.type,
      generatedAt: briefRow.generated_at,
      duration: briefRow.duration || 300,
      audioUrl: briefRow.audio_url,
      featureImageUrl: briefRow.featured_image_url || null,
      headline: briefRow.headline || 'Daily Civic Brief',
      title: briefRow.title || new Date(briefRow.generated_at).toLocaleDateString(),
      writtenDigest: briefRow.written_digest,
      billsCovered,
      newsArticles,
      policyAreas,
    };

    return NextResponse.json({
      success: true,
      brief: briefData,
    });

  } catch (error: any) {
    console.error('❌ Error fetching latest brief:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Extract bills from the markdown digest
 */
function extractBillsFromDigest(digest: string): Array<{
  id: string;
  billNumber: string;
  title: string;
  category: string;
  impactScore: number;
}> {
  const bills: Array<{
    id: string;
    billNumber: string;
    title: string;
    category: string;
    impactScore: number;
  }> = [];

  // Match bill sections in markdown
  const billRegex = /### (.+?)\n\*\*Bill Number:\*\* (.+?)\n[\s\S]*?\*\*Impact Score:\*\* (\d+)/g;
  let match;

  while ((match = billRegex.exec(digest)) !== null) {
    const title = match[1].trim();
    const billNumber = match[2].trim();
    const impactScore = parseInt(match[3], 10);

    // Determine category from title or bill number
    let category = 'General';
    if (title.toLowerCase().includes('health') || title.toLowerCase().includes('care')) {
      category = 'Health';
    } else if (title.toLowerCase().includes('education')) {
      category = 'Education';
    } else if (title.toLowerCase().includes('defense')) {
      category = 'Defense';
    } else if (title.toLowerCase().includes('energy') || title.toLowerCase().includes('environment')) {
      category = 'Energy';
    }

    bills.push({
      id: billNumber.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      billNumber,
      title,
      category,
      impactScore,
    });
  }

  return bills;
}

/**
 * Extract news articles from the markdown digest
 */
function extractNewsFromDigest(digest: string): Array<{
  title: string;
  topic: string;
  url: string;
}> {
  const articles: Array<{
    title: string;
    topic: string;
    url: string;
  }> = [];

  // Match news sections in markdown
  const newsRegex = /### \[([A-Z]+)\] (.+?)\n[\s\S]*?\*\*Source:\*\* (.+?)(?=\n|$)/g;
  let match;

  while ((match = newsRegex.exec(digest)) !== null) {
    const topic = match[1].toLowerCase();
    const title = match[2].trim();
    const url = match[3].trim();

    articles.push({
      title,
      topic,
      url,
    });
  }

  return articles;
}
