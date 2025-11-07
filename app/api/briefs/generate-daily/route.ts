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
  extra_snippets?: string[]; // Additional context snippets from Brave Search for richer dialogue
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

    // 4. Get user's policy area preferences (with fallback to defaults)
    let userPreferences = await getUserPreferences(user.id);

    // Fallback to default interests if user hasn't set any yet
    // This ensures brief generation always works, even before onboarding completion
    if (!userPreferences || userPreferences.length === 0) {
      console.log(`⚠️  User ${user.id} has no interests set, using defaults`);
      userPreferences = [
        'healthcare',
        'economy',
        'education',
        'defense',
        'environment'
      ];
    }

    console.log(`🎙️  Generating daily brief for user ${user.id}`);
    console.log(`📊 User interests: ${userPreferences.join(', ')}`);

    // 5. Fetch news articles from Brave Search (with extra_snippets for richer context)
    const newsArticles = await fetchNewsArticles(userPreferences, user.id);
    console.log(`📰 Fetched ${newsArticles.length} news articles`);

    // 6. Query bills with smart prioritization AND deduplication
    const bills = await fetchPrioritizedBills(userPreferences, user.id);
    console.log(`📜 Found ${bills.length} fresh relevant bills`);

    // Allow news-only briefs if no bills are available
    if (newsArticles.length === 0) {
      return NextResponse.json({
        error: 'No content available',
        message: 'No relevant news found for your interests today. Bills database may need syncing.',
      }, { status: 404 });
    }

    // Warn if no bills but continue with news
    if (bills.length === 0) {
      console.log('⚠️  No bills found - generating news-only brief');
    }

    // 7. Generate dialogue script with Claude (3-part structure)
    const dialogueScript = await generateBriefScript(newsArticles, bills, userPreferences);
    console.log(`✍️  Generated dialogue script: ${dialogueScript.length} lines`);

    // 8. Generate audio with ElevenLabs
    const audioBuffer = await generateDialogue(dialogueScript);
    console.log(`🎵 Generated audio: ${audioBuffer.length} bytes`);

    // 9. Calculate duration (MP3 @ 192kbps = 24,000 bytes per second)
    // Formula: duration (seconds) = bytes / 24000
    const estimatedDuration = Math.round(audioBuffer.length / 24000);

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

    // 13. Get featured image (first news article image)
    let featuredImage: string | null = null;
    if (newsArticles.length > 0) {
      const firstArticle = newsArticles[0];
      if (firstArticle.source_url || firstArticle.link) {
        const imageMap = await resolveNewsArticleImages([{
          source_url: firstArticle.source_url || firstArticle.link,
          policy_area: firstArticle.policy_area,
        }]);
        featuredImage = imageMap.get(firstArticle.source_url || firstArticle.link) || null;
      }
    }
    console.log(`🖼️  Featured image: ${featuredImage || 'none'}`);

    // 14. Generate brief title from top story
    const briefTitle = newsArticles.length > 0
      ? newsArticles[0].title
      : bills.length > 0
      ? bills[0].title
      : 'Daily Legislative Brief';

    // 15. Save brief to database
    const briefId = `brief_${user.id}_${Date.now()}`;

    // Escape single quotes in strings for SQL
    const escapeSql = (str: string) => str.replace(/'/g, "''");

    await executeQuery(
      `INSERT INTO briefs (
        id, user_id, type, title, audio_url, transcript, written_digest,
        featured_image_url, news_articles, bills_covered, policy_areas, duration, generated_at
      ) VALUES (
        '${briefId}',
        '${user.id}',
        'daily',
        '${escapeSql(briefTitle)}',
        '${escapeSql(audioUrl)}',
        '${escapeSql(transcript)}',
        '${escapeSql(writtenDigest)}',
        ${featuredImage ? `'${escapeSql(featuredImage)}'` : 'NULL'},
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

    // 16. Return success response
    return NextResponse.json({
      success: true,
      brief: {
        id: briefId,
        title: briefTitle,
        audio_url: audioUrl,
        written_digest: writtenDigest,
        featured_image_url: featuredImage,
        duration: estimatedDuration,
        news_count: newsArticles.length,
        bill_count: bills.length,
        policy_areas: userPreferences,
        generated_at: new Date().toISOString(),
        transcript: transcript,
      },
      generation_time_ms: duration,
    });

  } catch (error) {
    console.error('❌ Daily brief generation error:', error);

    // Get error message for logging and user feedback
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: error instanceof Error ? error.constructor.name : typeof error
    });

    // Provide specific error messages based on error content
    if (error instanceof Error) {
      if (error.message.includes('ElevenLabs')) {
        return NextResponse.json(
          { error: 'Audio generation failed', message: error.message, details: 'ElevenLabs API error' },
          { status: 503 }
        );
      }
      if (error.message.includes('Claude') || error.message.includes('Anthropic')) {
        return NextResponse.json(
          { error: 'Script generation failed', message: error.message, details: 'Claude API error' },
          { status: 503 }
        );
      }
      if (error.message.includes('Perplexity') || error.message.includes('Brave') || error.message.includes('news')) {
        return NextResponse.json(
          { error: 'News fetching failed', message: error.message, details: 'News API error' },
          { status: 503 }
        );
      }
      if (error.message.includes('Database') || error.message.includes('SQL')) {
        return NextResponse.json(
          { error: 'Database error', message: error.message, details: 'Database connection or query failed' },
          { status: 503 }
        );
      }
    }

    // Generic error with actual error message for debugging
    return NextResponse.json(
      {
        error: 'Failed to generate daily brief',
        message: errorMessage,
        details: 'An unexpected error occurred during brief generation'
      },
      { status: 500 }
    );
  }
}

/**
 * Check if user already has a brief generated today
 * Returns properly parsed brief with JSON fields converted to objects
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

  if (!result.rows || result.rows.length === 0) {
    return null;
  }

  const brief = result.rows[0];

  // Parse JSON fields before returning
  return {
    id: brief.id,
    title: brief.title || 'Daily Legislative Brief',
    audio_url: brief.audio_url,
    written_digest: brief.written_digest,
    featured_image_url: brief.featured_image_url,
    duration: brief.duration,
    type: brief.type,
    policy_areas: brief.policy_areas ? JSON.parse(brief.policy_areas) : [],
    bills_covered: brief.bills_covered ? JSON.parse(brief.bills_covered) : [],
    news_articles: brief.news_articles ? JSON.parse(brief.news_articles) : [],
    generated_at: brief.generated_at,
    transcript: brief.transcript,
    user_id: brief.user_id,
  };
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
 * Fetch news articles from Brave Search API (via direct function call)
 * Returns articles with extra_snippets for richer dialogue context
 */
async function fetchNewsArticles(policyAreas: string[], _userId: string): Promise<NewsArticle[]> {
  try {
    // Import the news fetching function directly to avoid HTTP fetch auth issues
    const { getPersonalizedNewsFast } = await import('@/lib/api/cerebras-tavily');

    console.log(`📰 Fetching news for policy areas: ${policyAreas.join(', ')}`);

    // Fetch news directly (returns PerplexityArticle[] directly)
    const articles = await getPersonalizedNewsFast(policyAreas);

    if (!articles || articles.length === 0) {
      console.warn('⚠️  No news articles returned from Brave Search');
      return [];
    }

    // Convert PerplexityArticle to NewsArticle format
    const newsArticles: NewsArticle[] = articles
      .slice(0, 10) // Limit to 10 articles max for brief generation
      .map((article: any) => ({
        title: article.title,
        summary: article.summary,
        policy_area: article.relevantTopics?.[0] || policyAreas[0] || 'general',
        link: article.url,
        source_url: article.url,
        source: article.source,
        published_date: article.publishedDate,
        extra_snippets: article.extraSnippets || [] // Include extra context for Claude
      }));

    console.log(`✅ Fetched ${newsArticles.length} articles with extra_snippets from Brave Search`);
    return newsArticles;
  } catch (error) {
    console.error('❌ Error fetching news articles:', error);
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
 * Fetch the brief generation prompt from database (or use default)
 */
async function getBriefPrompt(): Promise<string> {
  try {
    const result = await executeQuery(
      `SELECT prompt_text FROM system_prompts WHERE prompt_key = 'brief_generation'`,
      'users'
    );

    if (result.rows.length > 0) {
      console.log('✅ Using custom prompt from database');
      return result.rows[0].prompt_text;
    }

    console.log('ℹ️  Using default prompt (no custom prompt found)');
    return DEFAULT_BRIEF_PROMPT;
  } catch (error) {
    console.warn('⚠️  Error fetching prompt from database, using default:', error);
    return DEFAULT_BRIEF_PROMPT;
  }
}

/**
 * Default prompt template (fallback)
 */
const DEFAULT_BRIEF_PROMPT = `Create a personalized daily congressional brief for a user interested in: {policy_areas}.

**3-PART STRUCTURE (8-12 minutes total):**

**PART 1 - BREAKING NEWS (2-3 min):**
{breaking_news}

**PART 2 - TOP STORIES (5-7 min):**
Cover these bills in detail:
{top_stories}

**PART 3 - QUICK HITS (1-2 min):**
Briefly mention these bills:
{quick_hits}

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
- Target 8-12 minutes of audio (approximately 6000-9000 characters total)
- Generate 25-35 dialogue lines for natural conversation flow
- Each line should be 2-4 sentences MAX
- Use the extra context snippets to add specific details, quotes, and facts for richer storytelling`;

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

  // Build breaking news section
  const breakingNewsSection = breakingNews ? `Top story: "${breakingNews.title}"
Summary: ${breakingNews.summary}
Source: ${breakingNews.source}
${breakingNews.extra_snippets && breakingNews.extra_snippets.length > 0 ? `
Additional Context (use these snippets to enrich the dialogue with specific details, quotes, and facts):
${breakingNews.extra_snippets.map((snippet, i) => `${i + 1}. ${snippet}`).join('\n')}` : ''}` : 'No breaking news today.';

  // Build top stories section
  const topStoriesSection = topBills.map((bill, idx) => `
${idx + 1}. ${bill.bill_type.toUpperCase()} ${bill.bill_number} (Congress ${bill.congress}) - ${bill.title}
   Sponsor: ${bill.sponsor_name}
   Status: ${bill.status}
   Latest Action: ${bill.latest_action_text} (${bill.latest_action_date})
   Summary: ${bill.summary || 'No summary available'}
   Impact Score: ${bill.impact_score}/100
`).join('\n');

  // Build quick hits section
  const quickHitsSection = quickHitBills.map((bill, idx) => `
${idx + 1}. ${bill.bill_type.toUpperCase()} ${bill.bill_number} - ${bill.title}
`).join('\n');

  // Fetch prompt template from database
  const promptTemplate = await getBriefPrompt();

  // Replace template variables
  const prompt = promptTemplate
    .replace('{policy_areas}', policyAreas.join(', '))
    .replace('{breaking_news}', breakingNewsSection)
    .replace('{top_stories}', topStoriesSection)
    .replace('{quick_hits}', quickHitsSection);

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
export async function GET(_request: NextRequest) {
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
