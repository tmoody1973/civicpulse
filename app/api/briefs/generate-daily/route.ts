import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { executeQuery } from '@/lib/db/client';
import { generateDialogueScript } from '@/lib/ai/claude';
import { generateDialogue } from '@/lib/ai/elevenlabs';
import { uploadPodcast } from '@/lib/storage/vultr';
import { resolveNewsArticleImages } from '@/lib/images/feature-image';

/**
 * POST /api/briefs/generate-daily
 * Generate personalized daily audio brief for authenticated user
 *
 * Features:
 * - 3-part structure: Breaking News (2-3 min) + Top Stories (5-7 min) + Quick Hits (1-2 min)
 * - Smart prioritization: Bill status > Impact score > Recency
 * - Perplexity-enhanced news summaries
 * - Multi-host podcast (Sarah + James)
 * - Detailed written digest with feature images
 *
 * Target: 8-12 minute audio + comprehensive written version
 */

const requestSchema = z.object({
  force_regenerate: z.boolean().optional().default(false),
});

interface Bill {
  id: string;
  congress: number;
  bill_type: string;
  bill_number: number;
  title: string;
  summary: string | null;
  sponsor_name: string | null;
  sponsor_bioguide_id: string | null;
  latest_action_date: string;
  latest_action_text: string | null;
  status: string;
  policy_area: string | null;
  ai_policy_area: string | null;
  impact_score: number;
  issue_categories: string | null;
}

interface NewsArticle {
  title: string;
  summary: string;
  policy_area: string;
  link: string;
  source_url?: string; // Alias for link (for image resolution compatibility)
  source: string;
  published_date: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Check authentication
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    // 2. Validate input
    const body = await request.json();
    const { force_regenerate } = requestSchema.parse(body);

    // 3. Check for existing brief today (unless force regenerate)
    if (!force_regenerate) {
      const existingBrief = await checkExistingBrief(user.id);
      if (existingBrief) {
        return NextResponse.json({
          success: true,
          brief: existingBrief,
          cached: true,
          message: 'Using today\'s existing brief',
        });
      }
    }

    // 4. Get user's policy area preferences
    const userPreferences = await getUserPreferences(user.id);
    if (!userPreferences || userPreferences.length === 0) {
      return NextResponse.json({
        error: 'No policy area preferences set',
        message: 'Please select your interests in settings',
      }, { status: 400 });
    }

    console.log(`🎙️  Generating daily brief for user ${user.id}`);
    console.log(`📊 User interests: ${userPreferences.join(', ')}`);

    // 5. Fetch news articles from Perplexity
    const newsArticles = await fetchNewsArticles(userPreferences);
    console.log(`📰 Fetched ${newsArticles.length} news articles`);

    // 6. Query bills with smart prioritization AND deduplication
    const bills = await fetchPrioritizedBills(userPreferences, user.id);
    console.log(`📜 Found ${bills.length} fresh relevant bills`);

    if (bills.length === 0 && newsArticles.length === 0) {
      return NextResponse.json({
        error: 'No content available',
        message: 'No relevant bills or news found for your interests today',
      }, { status: 404 });
    }

    // 7. Generate dialogue script with Claude (3-part structure)
    const dialogueScript = await generateBriefScript(newsArticles, bills, userPreferences);
    console.log(`✍️  Generated dialogue script: ${dialogueScript.length} lines`);

    // 8. Generate audio with ElevenLabs
    const audioBuffer = await generateDialogue(dialogueScript);
    console.log(`🎵 Generated audio: ${audioBuffer.length} bytes`);

    // 9. Calculate duration (rough estimate: 1 byte ≈ 0.001 seconds for MP3 @ 192kbps)
    const estimatedDuration = Math.round(audioBuffer.length * 0.001);

    // 10. Upload audio to Vultr
    const audioUrl = await uploadPodcast(audioBuffer, {
      userId: user.id,
      type: 'daily',
      duration: estimatedDuration,
      billsCovered: bills.map(b => b.id),
      generatedAt: new Date(),
    });
    console.log(`☁️  Uploaded to: ${audioUrl}`);

    // 11. Generate written digest with feature images
    const writtenDigest = await generateWrittenDigest(newsArticles, bills);
    console.log(`📝 Generated written digest`);

    // 12. Generate transcript
    const transcript = dialogueScript
      .map(line => `${line.host.toUpperCase()}: ${line.text}`)
      .join('\n\n');

    // 13. Save brief to database
    const briefId = `brief_${user.id}_${Date.now()}`;

    // Escape single quotes in strings for SQL
    const escapeSql = (str: string) => str.replace(/'/g, "''");

    await executeQuery(
      `INSERT INTO briefs (
        id, user_id, type, audio_url, transcript, written_digest,
        news_articles, bills_covered, policy_areas, duration, generated_at
      ) VALUES (
        '${briefId}',
        '${user.id}',
        'daily',
        '${escapeSql(audioUrl)}',
        '${escapeSql(transcript)}',
        '${escapeSql(writtenDigest)}',
        '${escapeSql(JSON.stringify(newsArticles))}',
        '${escapeSql(JSON.stringify(bills.map(b => b.id)))}',
        '${escapeSql(JSON.stringify(userPreferences))}',
        ${estimatedDuration},
        CURRENT_TIMESTAMP
      )`,
      'users'
    );

    const duration = Date.now() - startTime;
    console.log(`✅ Brief generated in ${Math.round(duration / 1000)}s`);

    // 14. Return success response
    return NextResponse.json({
      success: true,
      brief: {
        id: briefId,
        audio_url: audioUrl,
        duration: estimatedDuration,
        news_count: newsArticles.length,
        bill_count: bills.length,
        policy_areas: userPreferences,
        generated_at: new Date().toISOString(),
      },
      generation_time_ms: duration,
    });

  } catch (error) {
    console.error('❌ Daily brief generation error:', error);

    // Provide specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ElevenLabs')) {
        return NextResponse.json(
          { error: 'Audio generation failed', message: 'Please try again in a moment' },
          { status: 503 }
        );
      }
      if (error.message.includes('Claude')) {
        return NextResponse.json(
          { error: 'Script generation failed', message: 'Please try again' },
          { status: 503 }
        );
      }
      if (error.message.includes('Perplexity')) {
        return NextResponse.json(
          { error: 'News fetching failed', message: 'Please try again' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate daily brief', message: 'Please try again' },
      { status: 500 }
    );
  }
}

/**
 * Check if user already has a brief generated today
 */
async function checkExistingBrief(userId: string): Promise<any | null> {
  const result = await executeQuery(
    `SELECT * FROM briefs
     WHERE user_id = '${userId}' AND type = 'daily'
     AND DATE(generated_at) = DATE('now')
     ORDER BY generated_at DESC
     LIMIT 1`,
    'users'
  );

  return result.rows && result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get user's policy area preferences from database
 */
async function getUserPreferences(userId: string): Promise<string[]> {
  const result = await executeQuery(
    `SELECT interests FROM users WHERE id = '${userId}'`,
    'users'
  );

  if (!result.rows || result.rows.length === 0) {
    return [];
  }

  const interests = JSON.parse(result.rows[0].interests || '[]');
  return Array.isArray(interests) ? interests : [];
}

/**
 * Fetch news articles from Perplexity API
 */
async function fetchNewsArticles(policyAreas: string[]): Promise<NewsArticle[]> {
  try {
    // Call our existing Perplexity API route
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/news/perplexity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policy_areas: policyAreas.slice(0, 5), // Limit to 5 policy areas
        limit: 2, // 2 articles per policy area = 10 total max
      }),
    });

    if (!response.ok) {
      console.warn('Perplexity API failed, continuing without news');
      return [];
    }

    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error('Error fetching news articles:', error);
    return [];
  }
}

/**
 * Fetch bills with smart prioritization AND deduplication
 * Priority: Bill status > Impact score > Recency > User engagement
 * Excludes bills covered in the last 30 days for this user
 */
async function fetchPrioritizedBills(policyAreas: string[], userId: string): Promise<Bill[]> {
  // Build policy area filter
  const policyFilters = policyAreas.map(area => `policy_area = '${area}' OR ai_policy_area = '${area}'`).join(' OR ');

  // Get bills covered in last 30 days for this user
  const recentBriefsResult = await executeQuery(
    `SELECT bills_covered FROM briefs
     WHERE user_id = '${userId}'
     AND generated_at >= DATE('now', '-30 days')`,
    'users'
  );

  // Extract all previously covered bill IDs
  const previouslyCoveredBills = new Set<string>();
  if (recentBriefsResult.rows) {
    for (const row of recentBriefsResult.rows) {
      try {
        const billIds = JSON.parse(row.bills_covered);
        if (Array.isArray(billIds)) {
          billIds.forEach(id => previouslyCoveredBills.add(id));
        }
      } catch (error) {
        console.error('Error parsing bills_covered:', error);
      }
    }
  }

  console.log(`🚫 Excluding ${previouslyCoveredBills.size} previously covered bills from last 30 days`);

  // Smart prioritization query
  const query = `
    SELECT
      id, congress, bill_type, bill_number, title, summary,
      sponsor_name, sponsor_bioguide_id, latest_action_date,
      latest_action_text, status, policy_area, ai_policy_area,
      impact_score, issue_categories,
      CASE
        WHEN status = 'enacted' THEN 1000
        WHEN status = 'passed_senate' OR status = 'passed_house' THEN 500
        WHEN status = 'in_committee' THEN 100
        ELSE 50
      END + impact_score + (JULIANDAY('now') - JULIANDAY(latest_action_date)) * -1 as priority_score
    FROM bills
    WHERE (${policyFilters})
      AND congress IN (118, 119)
      AND latest_action_date >= DATE('now', '-30 days')
    ORDER BY priority_score DESC
    LIMIT 50
  `;

  const result = await executeQuery(query, 'bills');
  const allBills = result.rows || [];

  // Filter out previously covered bills
  const freshBills = allBills.filter(bill => !previouslyCoveredBills.has(bill.id));

  console.log(`✨ Found ${freshBills.length} fresh bills (filtered from ${allBills.length} total)`);

  // Return top 15 fresh bills
  return freshBills.slice(0, 15);
}

/**
 * Generate dialogue script with 3-part structure
 * Part 1: Breaking News (2-3 min, 1 top story)
 * Part 2: Top Stories (5-7 min, 2-3 featured stories)
 * Part 3: Quick Hits (1-2 min, rapid mentions)
 */
async function generateBriefScript(
  newsArticles: NewsArticle[],
  bills: Bill[],
  policyAreas: string[]
) {
  // Select breaking news (most important story)
  const breakingNews = newsArticles.length > 0 ? newsArticles[0] : null;

  // Select top 2-3 bills for deep coverage
  const topBills = bills.slice(0, 3);

  // Select remaining bills for quick hits
  const quickHitBills = bills.slice(3, 7);

  // Build context for Claude
  const prompt = `Create a personalized daily congressional brief for a user interested in: ${policyAreas.join(', ')}.

**3-PART STRUCTURE (8-12 minutes total):**

**PART 1 - BREAKING NEWS (2-3 min):**
${breakingNews ? `Top story: "${breakingNews.title}"
Summary: ${breakingNews.summary}
Source: ${breakingNews.source}` : 'No breaking news today.'}

**PART 2 - TOP STORIES (5-7 min):**
Cover these bills in detail:
${topBills.map((bill, idx) => `
${idx + 1}. ${bill.bill_type.toUpperCase()} ${bill.bill_number} (Congress ${bill.congress}) - ${bill.title}
   Sponsor: ${bill.sponsor_name}
   Status: ${bill.status}
   Latest Action: ${bill.latest_action_text} (${bill.latest_action_date})
   Summary: ${bill.summary || 'No summary available'}
   Impact Score: ${bill.impact_score}/100
`).join('\n')}

**PART 3 - QUICK HITS (1-2 min):**
Briefly mention these bills:
${quickHitBills.map((bill, idx) => `
${idx + 1}. ${bill.bill_type.toUpperCase()} ${bill.bill_number} - ${bill.title}
`).join('\n')}

**STYLE GUIDELINES:**
- NPR-quality conversational tone
- Sarah leads breaking news, James adds context
- Explain legislation in plain language
- **CRITICAL: ALWAYS mention the Congress number (118th or 119th) when introducing each bill**
- **CRITICAL: ALWAYS mention the bill sponsor's name when discussing each bill**
- Highlight real-world impact on everyday people
- Natural back-and-forth (not monologues)
- End with call-to-action

**FORMAT:**
Return JSON array of dialogue lines:
[
  {"host": "sarah", "text": "Good morning! Welcome to your daily HakiVo brief..."},
  {"host": "james", "text": "Hey Sarah! Let's dive into today's top story..."},
  ...
]

**CRITICAL:**
- Total character count MUST be under 4000 characters
- Generate 15-20 dialogue lines total
- Each line should be 2-3 sentences MAX`;

  // Generate script with Claude
  const dialogue = await generateDialogueScript([
    {
      id: 'brief',
      billType: 'brief',
      billNumber: 0,
      congress: 119,
      title: 'Daily Brief',
      sponsorName: '',
      latestActionDate: new Date().toISOString(),
      latestActionText: '',
      summary: prompt,
    } as any,
  ], 'daily');

  return dialogue;
}

/**
 * Generate comprehensive written digest with feature images
 */
async function generateWrittenDigest(
  newsArticles: NewsArticle[],
  bills: Bill[]
): Promise<string> {
  // Extract feature images for news articles
  // Map link to source_url for compatibility with image resolver
  const articlesForImages = newsArticles.map(a => ({
    source_url: a.link,
    policy_area: a.policy_area,
  }));
  const newsImages = await resolveNewsArticleImages(articlesForImages);

  let digest = `# Your Daily Congressional Brief\n\n`;
  digest += `*Generated on ${new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}*\n\n`;

  // Section 1: Breaking News
  if (newsArticles.length > 0) {
    digest += `## 🔥 Breaking News\n\n`;
    const topStory = newsArticles[0];
    const imageUrl = newsImages.get(topStory.link);
    if (imageUrl) {
      digest += `![${topStory.title}](${imageUrl})\n\n`;
    }
    digest += `### ${topStory.title}\n\n`;
    digest += `${topStory.summary}\n\n`;
    digest += `*Source: [${topStory.source}](${topStory.link}) • ${topStory.published_date}*\n\n`;
    digest += `---\n\n`;
  }

  // Section 2: Top Bills (Detailed)
  digest += `## 📜 Featured Legislation\n\n`;
  const topBills = bills.slice(0, 3);
  for (const bill of topBills) {
    digest += `### ${bill.bill_type.toUpperCase()} ${bill.bill_number}: ${bill.title}\n\n`;
    if (bill.sponsor_name) {
      digest += `**Sponsor:** ${bill.sponsor_name}\n\n`;
    }
    digest += `**Status:** ${bill.status.replace(/_/g, ' ').toUpperCase()}\n\n`;
    digest += `**Latest Action:** ${bill.latest_action_text} (${new Date(bill.latest_action_date).toLocaleDateString()})\n\n`;
    if (bill.summary) {
      digest += `**Summary:**\n\n${bill.summary}\n\n`;
    }
    digest += `**Impact Score:** ${bill.impact_score}/100\n\n`;
    digest += `[Read full bill on Congress.gov](https://congress.gov/bill/${bill.congress}th-congress/${bill.bill_type}/${bill.bill_number})\n\n`;
    digest += `---\n\n`;
  }

  // Section 3: Other News
  if (newsArticles.length > 1) {
    digest += `## 📰 More News\n\n`;
    for (let i = 1; i < newsArticles.length; i++) {
      const article = newsArticles[i];
      digest += `### ${article.title}\n\n`;
      digest += `${article.summary}\n\n`;
      digest += `*[Read more on ${article.source}](${article.link})*\n\n`;
    }
    digest += `---\n\n`;
  }

  // Section 4: Quick Hits (Brief mentions)
  const quickHits = bills.slice(3, 10);
  if (quickHits.length > 0) {
    digest += `## ⚡ Quick Hits\n\n`;
    digest += `Other bills you might be interested in:\n\n`;
    for (const bill of quickHits) {
      digest += `- **[${bill.bill_type.toUpperCase()} ${bill.bill_number}](https://congress.gov/bill/${bill.congress}th-congress/${bill.bill_type}/${bill.bill_number}):** ${bill.title}\n`;
    }
    digest += `\n`;
  }

  // Footer
  digest += `---\n\n`;
  digest += `*💡 Stay informed. Stay engaged. Stay empowered.*\n\n`;
  digest += `[Manage your preferences](${process.env.NEXT_PUBLIC_APP_URL}/settings) • [View all briefs](${process.env.NEXT_PUBLIC_APP_URL}/briefs)\n`;

  return digest;
}

/**
 * GET /api/briefs/generate-daily
 * Check if user has a brief today, or generate a new one
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for existing brief
    const existingBrief = await checkExistingBrief(user.id);
    if (existingBrief) {
      return NextResponse.json({
        success: true,
        brief: existingBrief,
        cached: true,
      });
    }

    // No brief exists, redirect to POST to generate one
    return NextResponse.json({
      success: false,
      message: 'No brief generated today. Please generate a new one.',
      action: 'generate',
    });

  } catch (error) {
    console.error('Error checking daily brief:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
