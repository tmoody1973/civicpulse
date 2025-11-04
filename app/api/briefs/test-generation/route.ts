import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/client';
import { generateDialogueScript } from '@/lib/ai/claude';
import { generateDialogue, estimateAudioDuration } from '@/lib/ai/elevenlabs';
import { uploadPodcast } from '@/lib/storage/vultr';
import { resolveNewsArticleImages } from '@/lib/images/feature-image';

/**
 * POST /api/briefs/test-generation
 * TEST ENDPOINT - Bypasses auth for development testing
 *
 * This allows us to test the full pipeline without auth cookies.
 * REMOVE IN PRODUCTION or protect with API key.
 */

interface NewsArticle {
  title: string;
  summary: string;
  policy_area: string;
  link: string;
  source_url?: string;
  source: string;
  published_date: string;
}

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
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Fixed test user ID (demo user with healthcare, education, climate interests)
    const userId = 'user-001';

    console.log(`🎙️  [TEST] Generating daily brief for user ${userId}`);

    // Get user preferences
    const userPreferences = await getUserPreferences(userId);
    console.log(`📊 User interests: ${userPreferences.join(', ')}`);

    // Fetch news
    const newsArticles = await fetchNewsArticles(userPreferences);
    console.log(`📰 Fetched ${newsArticles.length} news articles`);

    // Fetch bills
    const bills = await fetchPrioritizedBills(userPreferences);
    console.log(`📜 Found ${bills.length} relevant bills`);

    if (bills.length === 0 && newsArticles.length === 0) {
      return NextResponse.json({
        error: 'No content available',
        message: 'No relevant bills or news found',
      }, { status: 404 });
    }

    // Generate dialogue script
    const dialogueScript = await generateBriefScript(newsArticles, bills, userPreferences);
    console.log(`✍️  Generated dialogue script: ${dialogueScript.length} lines`);

    // Generate audio
    const audioBuffer = await generateDialogue(dialogueScript);
    console.log(`🎵 Generated audio: ${audioBuffer.length} bytes`);

    // Calculate duration based on word count (150 words/min)
    const estimatedDuration = estimateAudioDuration(dialogueScript);
    console.log(`⏱️  Estimated duration: ${estimatedDuration}s (${Math.floor(estimatedDuration / 60)}m ${estimatedDuration % 60}s)`);

    // Upload audio
    const audioUrl = await uploadPodcast(audioBuffer, {
      userId,
      type: 'daily',
      duration: estimatedDuration,
      billsCovered: bills.map(b => b.id),
      generatedAt: new Date(),
    });
    console.log(`☁️  Uploaded to: ${audioUrl}`);

    // Generate written digest
    const writtenDigest = await generateWrittenDigest(newsArticles, bills);
    console.log(`📝 Generated written digest`);

    // Extract featured image from news articles
    // First check if Perplexity provided an image, otherwise extract from article URLs
    let featuredImage: string | null = null;

    if (newsArticles.length > 0) {
      // Check if first article has Perplexity image
      const firstArticle = newsArticles[0] as any;
      if (firstArticle.featured_image) {
        // Extract image_url from the featured_image object
        featuredImage = typeof firstArticle.featured_image === 'object'
          ? (firstArticle.featured_image as any).image_url || null
          : firstArticle.featured_image;
        console.log(`🖼️  Using Perplexity image: ${featuredImage}`);
      } else {
        // Fall back to extracting OG images from article URLs
        const articlesForImages = newsArticles.map(a => ({
          source_url: a.link,
          policy_area: a.policy_area,
        }));
        const newsImages = await resolveNewsArticleImages(articlesForImages);
        featuredImage = newsImages.get(newsArticles[0].link) || null;
        console.log(`🖼️  Featured image from OG tag: ${featuredImage || 'Using policy area icon'}`);
      }
    }

    // Generate title from policy areas and top news
    const briefTitle = newsArticles.length > 0
      ? newsArticles[0].title
      : userPreferences.join(', ');
    console.log(`📰 Brief title: ${briefTitle}`);

    // Generate transcript
    const transcript = dialogueScript
      .map(line => `${line.host.toUpperCase()}: ${line.text}`)
      .join('\n\n');

    // Save to database
    const briefId = `brief_${userId}_${Date.now()}`;
    const escapeSql = (str: string | null | undefined) => {
      if (!str) return '';
      return String(str).replace(/'/g, "''");
    };

    await executeQuery(
      `INSERT INTO briefs (
        id, user_id, type, audio_url, transcript, written_digest,
        news_articles, bills_covered, policy_areas, duration,
        title, featured_image_url, generated_at
      ) VALUES (
        '${briefId}',
        '${userId}',
        'daily',
        '${escapeSql(audioUrl)}',
        '${escapeSql(transcript)}',
        '${escapeSql(writtenDigest)}',
        '${escapeSql(JSON.stringify(newsArticles))}',
        '${escapeSql(JSON.stringify(bills.map(b => b.id)))}',
        '${escapeSql(JSON.stringify(userPreferences))}',
        ${estimatedDuration},
        '${escapeSql(briefTitle)}',
        ${featuredImage ? `'${escapeSql(featuredImage)}'` : 'NULL'},
        CURRENT_TIMESTAMP
      )`,
      'users'
    );

    const duration = Date.now() - startTime;
    console.log(`✅ Brief generated in ${Math.round(duration / 1000)}s`);

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
    console.error('❌ Test brief generation error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message, stack: error.stack },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate brief' },
      { status: 500 }
    );
  }
}

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
 * Fetch news articles directly from Perplexity (bypasses auth for testing)
 */
async function fetchNewsArticles(policyAreas: string[]): Promise<NewsArticle[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    console.warn('PERPLEXITY_API_KEY not set, skipping news fetch');
    return [];
  }

  try {
    const allArticles: NewsArticle[] = [];

    // Map user-friendly policy areas to search queries
    const policyAreaToQuery: Record<string, string> = {
      'healthcare': 'healthcare and medical legislation',
      'health': 'healthcare and medical legislation',
      'education': 'education and schools',
      'climate': 'climate change and environment',
      'environmental protection': 'climate change and environment',
      'economy': 'economy and jobs',
      'business': 'business and trade',
      'technology': 'technology and privacy',
      'immigration': 'immigration and border',
      'defense': 'defense and national security',
    };

    // Fetch 1 article per policy area
    for (const policyArea of policyAreas.slice(0, 3)) {
      const searchQuery = policyAreaToQuery[policyArea.toLowerCase()] || policyArea;

      const prompt = `Search for recent stories or articles about ${searchQuery} in the U.S.

For each story, return a JSON object with the following structure:
{
  "title": "[Story Title]",
  "summary": "[5-8 sentence detailed summary covering key points, context, and implications]",
  "policy_area": "${policyArea}",
  "link": "[URL to story]",
  "source": "[Publication name, e.g., The Hill, Politico, CNN, NPR]",
  "published_date": "[Approximate date if available, e.g., 'Today', '2 days ago', 'Nov 1, 2025']"
}

Return an array of such JSON objects—one for each relevant story. Limit to 1 most recent article.

IMPORTANT:
- Summaries should be 5-8 sentences with enough detail
- Include context about why this matters and real-world impact
- Return ONLY valid JSON array, no additional text or markdown formatting.`;

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that searches for recent U.S. congressional news and returns structured JSON data. Only return valid JSON arrays, no markdown or additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1000,
          return_images: true, // Request images from Perplexity
        }),
      });

      if (!response.ok) {
        console.warn(`Perplexity API failed for ${policyArea}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const images = data.images || []; // Extract images from Perplexity response

      if (!content) {
        console.warn(`No content in Perplexity response for ${policyArea}`);
        continue;
      }

      console.log(`📸 Perplexity returned ${images.length} images for ${policyArea}`);

      // Parse JSON (handle markdown code blocks)
      let jsonText = content;
      if (content.includes('```json')) {
        jsonText = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
      } else if (content.includes('```')) {
        jsonText = content.match(/```\n([\s\S]*?)\n```/)?.[1] || content;
      }

      try {
        const articles = JSON.parse(jsonText);
        if (Array.isArray(articles)) {
          // Attach first image URL to first article if available
          const filteredArticles = articles.filter((a: any) => a.title && a.summary && a.link);
          if (filteredArticles.length > 0 && images.length > 0) {
            filteredArticles[0].featured_image = images[0]; // Add Perplexity image URL
          }
          allArticles.push(...filteredArticles);
        }
      } catch (parseError) {
        console.error(`Failed to parse Perplexity JSON for ${policyArea}:`, jsonText);
      }
    }

    console.log(`📰 Fetched ${allArticles.length} news articles from Perplexity`);
    return allArticles;

  } catch (error) {
    console.error('Error fetching news from Perplexity:', error);
    return [];
  }
}

/**
 * Map user-friendly policy area names to database capitalization
 */
function normalizePolicyArea(userInterest: string): string {
  const mapping: Record<string, string> = {
    'healthcare': 'Health',
    'health': 'Health',
    'education': 'Education',
    'climate': 'Environmental Protection',
    'environment': 'Environmental Protection',
    'business': 'Commerce',
    'economy': 'Economics and Public Finance',
    'finance': 'Economics and Public Finance',
    'technology': 'Science, Technology, Communications',
    'tech': 'Science, Technology, Communications',
    'immigration': 'Immigration',
    'defense': 'Armed Forces and National Security',
    'military': 'Armed Forces and National Security',
    'energy': 'Energy',
    'agriculture': 'Agriculture and Food',
    'transportation': 'Transportation and Public Works',
    'housing': 'Housing and Community Development',
    'labor': 'Labor and Employment',
    'tax': 'Taxation',
    'taxes': 'Taxation',
    'crime': 'Crime and Law Enforcement',
    'justice': 'Crime and Law Enforcement',
  };

  return mapping[userInterest.toLowerCase()] || userInterest;
}

async function fetchPrioritizedBills(policyAreas: string[]): Promise<Bill[]> {
  // Normalize policy areas to match database capitalization
  const normalizedAreas = policyAreas.map(normalizePolicyArea);

  console.log(`🔍 Normalized policy areas:`, {
    original: policyAreas,
    normalized: normalizedAreas
  });

  // Build policy area filter - match either policy_area or ai_policy_area
  const policyFilters = normalizedAreas
    .map(area => `(policy_area = '${area}' OR ai_policy_area = '${area}')`)
    .join(' OR ');

  // Fallback if no policy areas provided
  const whereClause = policyFilters.length > 0
    ? `WHERE (${policyFilters}) AND congress = 119 AND latest_action_date >= DATE('now', '-30 days')`
    : `WHERE congress = 119 AND latest_action_date >= DATE('now', '-30 days')`;

  const query = `
    SELECT
      id, congress, bill_type, bill_number, title, summary,
      sponsor_name, sponsor_bioguide_id, latest_action_date,
      latest_action_text, status, policy_area, ai_policy_area,
      COALESCE(impact_score, 0) as impact_score, issue_categories,
      (CASE
        WHEN status = 'enacted' THEN 1000
        WHEN status = 'passed_senate' OR status = 'passed_house' THEN 500
        WHEN status = 'in_committee' THEN 100
        ELSE 50
      END + COALESCE(impact_score, 0) + (JULIANDAY('now') - JULIANDAY(latest_action_date)) * -1) as priority_score
    FROM bills
    ${whereClause}
    ORDER BY priority_score DESC
    LIMIT 15
  `;

  console.log(`📊 Bill query WHERE clause:`, whereClause);

  const result = await executeQuery(query, 'bills');
  console.log(`📜 Found ${result.rows?.length || 0} bills`);

  return result.rows || [];
}

async function generateBriefScript(
  newsArticles: NewsArticle[],
  bills: Bill[],
  policyAreas: string[]
) {
  const breakingNews = newsArticles.length > 0 ? newsArticles[0] : null;
  const topBills = bills.slice(0, 2); // Reduced from 3 to 2
  const quickHitBills = bills.slice(2, 4); // Reduced from 3-7 to 2-4

  const prompt = `Create a personalized daily congressional brief for a user interested in: ${policyAreas.join(', ')}.

**TARGET: 6-8 MINUTES OF AUDIO (3000-4000 characters total)**

**STRUCTURE:**

**PART 1 - OPENING (45 seconds):**
- Warm greeting from Sarah
- James adds welcome and sets tone
- Preview today's 2-3 main topics

${breakingNews ? `**PART 2 - BREAKING NEWS (1.5-2 min):**
Top story: "${breakingNews.title}"
Summary: ${breakingNews.summary}
Source: ${breakingNews.source}

Sarah and James discuss:
- What happened and why it matters
- Real-world impact on everyday Americans
- Next steps or what to watch
` : ''}

**PART ${breakingNews ? '3' : '2'} - TOP ${topBills.length} BILLS (4-5 min TOTAL):**
For EACH bill below, create 6-8 dialogue exchanges with detailed discussion:

${topBills.map((bill, idx) => `
Bill ${idx + 1}: ${bill.bill_type.toUpperCase()} ${bill.bill_number}
Title: ${bill.title}
Sponsor: ${bill.sponsor_name}
Status: ${bill.status}
Latest Action (${bill.latest_action_date}): ${bill.latest_action_text}
Summary: ${bill.summary || 'Legislation addressing this policy area'}
Impact Score: ${bill.impact_score}/100

Discuss:
- What the bill does in plain language
- Who it affects and how
- Why the sponsor introduced it
- Current status and next steps
- Real-world examples of impact
`).join('\n')}

**PART ${breakingNews ? '4' : '3'} - QUICK HITS (45-60 sec):**
Briefly mention these bills (2-3 sentences EACH):
${quickHitBills.map((bill, idx) => `
${idx + 1}. ${bill.bill_type.toUpperCase()} ${bill.bill_number} - ${bill.title}
`).join('\n')}

**PART ${breakingNews ? '5' : '4'} - CLOSING (30-45 sec):**
- Sarah and James wrap up
- Encourage civic engagement
- Sign off

**STYLE GUIDELINES:**
- NPR Morning Edition quality
- Sarah is enthusiastic and explains clearly
- James adds analysis and asks follow-up questions
- Natural back-and-forth conversation
- Plain language - explain like talking to a friend
- Show genuine interest and curiosity
- Smooth transitions between topics

**FORMAT:**
Return JSON array of dialogue lines:
[
  {"host": "sarah", "text": "Good morning! Welcome to your daily HakiVo brief. I'm Sarah."},
  {"host": "james", "text": "And I'm James. We've got some really interesting legislation to talk about today."},
  ...
]

**CRITICAL REQUIREMENTS:**
- TOTAL character count: 3000-4000 characters (MINIMUM 3000!)
- Generate 20-28 dialogue lines
- Each line: 3-5 sentences (100-180 chars per line)
- EACH of the ${topBills.length} main bills gets 6-8 dialogue exchanges
- Quick hits: 2-3 sentences per bill
- Opening: 3-4 exchanges
- Closing: 2-3 exchanges
- THIS MUST PRODUCE 6-8 MINUTES OF AUDIO!

DO NOT summarize or abbreviate - this needs to be a full conversation with depth and detail.`;

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

async function generateWrittenDigest(
  newsArticles: NewsArticle[],
  bills: Bill[]
): Promise<string> {
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

  // Breaking News
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

  // Featured Legislation
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

  // More News
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

  // Quick Hits
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
