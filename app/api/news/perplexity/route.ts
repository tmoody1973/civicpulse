import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';

/**
 * POST /api/news/perplexity
 * Fetches and enhances news articles using Perplexity AI
 *
 * Takes policy areas and returns structured news summaries
 * Uses Perplexity's API to find relevant congressional news
 *
 * Example request:
 * POST /api/news/perplexity
 * { "policy_areas": ["Healthcare", "Climate"] }
 *
 * Example response:
 * {
 *   "success": true,
 *   "articles": [
 *     {
 *       "title": "Senate Passes Affordable Insulin Act",
 *       "summary": "The Senate voted 68-32 to cap insulin prices at $35/month...",
 *       "policy_area": "Healthcare",
 *       "link": "https://thehill.com/..."
 *     }
 *   ],
 *   "cached": false
 * }
 */

// Validation schema
const requestSchema = z.object({
  policy_areas: z.array(z.string()).min(1).max(5), // Max 5 policy areas per request
  limit: z.number().min(1).max(20).optional().default(5), // Articles per policy area
});

// Policy area to search query mapping
const POLICY_AREA_TO_QUERY: Record<string, string> = {
  'healthcare': 'healthcare and medical legislation',
  'education': 'education and schools',
  'science': 'science and research funding',
  'technology': 'technology and privacy',
  'climate': 'climate change and environment',
  'economy': 'economy and jobs',
  'business': 'business and trade',
  'taxes': 'taxes and fiscal policy',
  'immigration': 'immigration and border',
  'housing': 'housing and affordable housing',
  'defense': 'defense and national security',
  'transportation': 'transportation and infrastructure',
  'agriculture': 'agriculture and food',
  'social': 'social security and welfare',
  'civil-rights': 'civil rights and voting rights',
};

// Simple in-memory cache (in production, use Redis or SmartMemory)
const cache = new Map<string, { articles: any[]; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    // Validate input
    const body = await request.json();
    const validated = requestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validated.error.errors
        },
        { status: 400 }
      );
    }

    const { policy_areas, limit } = validated.data;

    // Check cache
    const cacheKey = `${policy_areas.join(',')}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ Returning cached Perplexity results');
      return NextResponse.json({
        success: true,
        articles: cached.articles,
        cached: true,
        policy_areas,
      });
    }

    // Fetch from Perplexity API
    const allArticles: any[] = [];

    for (const policyArea of policy_areas) {
      try {
        const searchQuery = POLICY_AREA_TO_QUERY[policyArea] || policyArea;
        const articles = await fetchPerplexityArticles(searchQuery, policyArea, limit);
        allArticles.push(...articles);
      } catch (error) {
        console.error(`Failed to fetch articles for ${policyArea}:`, error);
        // Continue with other policy areas even if one fails
      }
    }

    // Update cache
    cache.set(cacheKey, {
      articles: allArticles,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      articles: allArticles,
      cached: false,
      policy_areas,
      count: allArticles.length,
    });

  } catch (error) {
    console.error('Perplexity API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch news articles',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Fetches articles from Perplexity API for a specific topic
 */
async function fetchPerplexityArticles(
  searchQuery: string,
  policyArea: string,
  limit: number
): Promise<any[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  // Construct the prompt using the format from user's examples
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

Return an array of such JSON objects—one for each relevant story. Limit to ${limit} most recent articles.

IMPORTANT:
- Summaries should be 5-8 sentences with enough detail for users to understand the story without clicking through
- Include context about why this matters and what the real-world implications are
- Return ONLY valid JSON array, no additional text or markdown formatting.`;

  // Call Perplexity API
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar', // Fast model with web search
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
      temperature: 0.2, // Low temperature for consistent structured output
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Extract response text
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in Perplexity response');
  }

  // Parse JSON from response
  // Perplexity sometimes wraps JSON in markdown code blocks, so we need to clean it
  let jsonText = content;
  if (content.includes('```json')) {
    jsonText = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
  } else if (content.includes('```')) {
    jsonText = content.match(/```\n([\s\S]*?)\n```/)?.[1] || content;
  }

  try {
    const articles = JSON.parse(jsonText);

    // Validate that it's an array
    if (!Array.isArray(articles)) {
      console.warn('Perplexity returned non-array:', articles);
      return [];
    }

    // Validate article structure
    return articles.filter(article =>
      article.title &&
      article.summary &&
      article.link &&
      article.policy_area
    ).map(article => ({
      ...article,
      // Ensure all fields are present with defaults
      source: article.source || 'Unknown',
      published_date: article.published_date || 'Recent',
    }));

  } catch (parseError) {
    console.error('Failed to parse Perplexity JSON response:', jsonText);
    throw new Error('Invalid JSON response from Perplexity');
  }
}

/**
 * GET /api/news/perplexity
 * Fetches news for authenticated user's interests
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    // Get user interests from database
    const { executeQuery } = await import('@/lib/db/client');
    const result = await executeQuery(
      `SELECT interests FROM users WHERE id = '${user.id}'`,
      'users'
    );

    if (!result || !result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const interests = JSON.parse(result.rows[0].interests || '[]');

    if (interests.length === 0) {
      return NextResponse.json({
        success: true,
        articles: [],
        message: 'No interests set. Please update your preferences.',
      });
    }

    // Fetch articles for user's interests
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5');

    return POST(
      new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ policy_areas: interests.slice(0, 5), limit }),
      })
    );

  } catch (error) {
    console.error('Error fetching user interests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
