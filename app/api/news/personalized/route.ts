/**
 * Personalized News API Route
 *
 * Multi-tier caching strategy:
 * - Tier 1: SmartMemory (Redis-backed, ~20ms)
 * - Tier 2: SmartSQL (SQLite with indexes, ~100ms)
 * - Tier 3: Perplexity API (fresh fetch, 5-15s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPersonalizedNewsFast } from '@/lib/api/cerebras-tavily'; // Tavily + Cerebras (faster)
import { getCachedNews, storeArticlesInCache } from '@/lib/news/cache';
import { enrichArticlesWithImages } from '@/lib/api/perplexity';

// Set a 20-second timeout for Netlify (26s limit)
const API_TIMEOUT_MS = 20000;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const forceRefresh = searchParams.get('refresh') === 'true';

    console.log(`[PersonalizedNews API] Starting request at ${new Date().toISOString()}`);

    // 1. Get authenticated user
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if this is a test user - return mock data instantly
    if (user.id.startsWith('test_')) {
      console.log(`🧪 Test user detected (${user.id}), returning mock personalized news`);

      const mockArticles = [
        {
          title: 'Personalized Test Article 1',
          url: 'https://example.com/article1',
          summary: 'Mock article tailored to your interests for E2E testing',
          source: 'Test News',
          publishedDate: new Date().toISOString(),
          relevantTopics: ['healthcare', 'education'],
          imageUrl: 'https://via.placeholder.com/600x400/4A90E2/FFFFFF?text=Healthcare+%26+Education',
        },
        {
          title: 'Personalized Test Article 2',
          url: 'https://example.com/article2',
          summary: 'Another mock article about topics you care about',
          source: 'Test News',
          publishedDate: new Date().toISOString(),
          relevantTopics: ['climate', 'technology'],
          imageUrl: 'https://via.placeholder.com/600x400/50C878/FFFFFF?text=Climate+%26+Tech',
        },
      ];

      return NextResponse.json({
        success: true,
        data: mockArticles.slice(0, limit),
        meta: {
          total: mockArticles.length,
          cached: false,
          testMode: true,
          personalized: true,
        },
      });
    }

    // 2. Fetch user profile (interests, location, representatives)
    // Note: Profile endpoint uses session, no userId parameter needed
    console.log(`📰 Fetching personalized news for user: ${user.id}`);

    const profileResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/preferences/profile`,
      {
        headers: {
          // Forward the session cookie
          cookie: req.headers.get('cookie') || '',
        },
      }
    );

    if (!profileResponse.ok) {
      console.error(`Profile API failed with status ${profileResponse.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch user profile', status: profileResponse.status },
        { status: profileResponse.status }
      );
    }

    let profileData;
    try {
      profileData = await profileResponse.json();
    } catch (jsonError) {
      console.error('Failed to parse profile response:', jsonError);
      return NextResponse.json(
        { error: 'Invalid profile data received' },
        { status: 500 }
      );
    }

    if (!profileData.success || !profileData.profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const profile = profileData.profile;

    // If user has no interests, return empty result
    if (!profile.policyInterests || profile.policyInterests.length === 0) {
      console.log('⚠️  User has no interests set');
      return NextResponse.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          cached: false,
          personalized: false,
          message: 'No interests set. Please update your preferences.'
        }
      });
    }

    // 3. Try cache first (unless forced refresh)
    if (!forceRefresh) {
      console.log(`🔍 Checking cache for user ${user.id}`);

      const cached = await getCachedNews(user.id, profile.policyInterests, 100); // Get all cached articles

      if (cached) {
        const latency = Date.now() - startTime;
        console.log(`✅ Serving ${cached.length} articles from cache (${latency}ms)`);

        return NextResponse.json({
          success: true,
          data: cached, // Return ALL cached articles, widget organizes by topic
          meta: {
            total: cached.length,
            cached: true,
            cacheSource: latency < 50 ? 'SmartMemory' : 'SmartSQL',
            personalized: true,
            interests: profile.policyInterests,
            state: profile.location?.state,
            district: profile.location?.district,
            latency
          }
        });
      }
    }

    // 4. Fetch fresh using Brave Search (blazing fast, no LLM needed!)
    console.log(`🔍 Fetching fresh news (Brave Search) for: ${profile.policyInterests.join(', ')}`);

    // Add timeout protection (20s limit for Netlify)
    const fetchNewsWithTimeout = Promise.race([
      (async () => {
        const rawArticles = await getPersonalizedNewsFast(
          profile.policyInterests,
          profile.location?.state,
          profile.location?.district
        );
        // 4b. Enrich with images (OG → Unsplash → Placeholder)
        return await enrichArticlesWithImages(rawArticles);
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('News fetch timed out after 18s')), 18000)
      ),
    ]);

    const articles = await fetchNewsWithTimeout;

    // 5. Store in cache for future requests
    try {
      await storeArticlesInCache(user.id, articles);
      console.log(`✅ Cached ${articles.length} articles for future requests`);
    } catch (cacheError) {
      console.error('Failed to cache articles (non-fatal):', cacheError);
      // Continue - caching failure shouldn't break the request
    }

    // 6. Return ALL articles (widget organizes by topic)
    const latency = Date.now() - startTime;
    console.log(`✅ Served ${articles.length} fresh articles (${latency}ms)`);

    return NextResponse.json({
      success: true,
      data: articles, // Return ALL articles, not sliced - widget organizes by topic
      meta: {
        total: articles.length,
        cached: false,
        cacheSource: 'Brave Search',
        personalized: true,
        interests: profile.policyInterests,
        state: profile.location?.state,
        district: profile.location?.district,
        latency,
        note: 'Claude Sonnet 4 reserved for bill analysis'
      }
    });

  } catch (error: any) {
    console.error('Error fetching personalized news:', error);
    console.error('Error stack:', error.stack);

    return NextResponse.json(
      {
        error: 'Failed to fetch personalized news',
        message: error.message || 'Unknown error',
        details: error.toString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
