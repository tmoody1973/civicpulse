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
import { getCachedNews } from '@/lib/news/cache';
import {
  saveNewsArticles,
  getRecentNewsArticles,
  type NewsArticleInput,
} from '@/lib/db/news-articles';

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

    // 3. Check database first (articles created in last 1 hour)
    if (!forceRefresh) {
      console.log(`🔍 Checking database for recent articles`);

      try {
        const cachedArticles = await getRecentNewsArticles(
          profile.policyInterests,
          60 * 60 * 1000, // 1 hour cache for better performance
          limit
        );

        if (cachedArticles.length >= limit) {
          const latency = Date.now() - startTime;
          console.log(`✅ Serving ${cachedArticles.length} articles from database (${latency}ms)`);

          // Skip topic images for cached data to avoid timeout
          // Frontend will use cached images or show without images
          console.log(`⚡ Returning cached articles without topic images (performance optimization)`);

          // Convert database format to API format
          const apiArticles = cachedArticles.map(article => ({
            title: article.title,
            url: article.url,
            summary: article.summary,
            source: article.source,
            publishedDate: article.publishedDate,
            relevantTopics: article.relevantTopics,
          }));

          return NextResponse.json({
            success: true,
            data: apiArticles,
            topicImages: [], // Empty for cached data
            meta: {
              total: apiArticles.length,
              cached: true,
              cacheSource: 'Database (news_articles table)',
              personalized: true,
              interests: profile.policyInterests,
              state: profile.location?.state,
              district: profile.location?.district,
              latency
            }
          });
        }
      } catch (dbError: any) {
        console.warn('Database read failed (non-fatal), continuing to fresh fetch:', dbError.message);
      }
    }

    // 4. Fetch fresh using Brave Search (blazing fast, no LLM needed!)
    console.log(`🔍 Fetching fresh news (Brave Search) for: ${profile.policyInterests.join(', ')}`);

    const freshArticles = await getPersonalizedNewsFast(
      profile.policyInterests,
      profile.location?.state,
      profile.location?.district
    );

    // 5. Fetch topic header images (one per interest, max 8 requests)
    console.log(`📸 Fetching topic header images for ${profile.policyInterests.length} interests...`);

    const { getRandomPhoto } = await import('@/lib/api/pexels');

    const topicImages = await Promise.all(
      profile.policyInterests.map(async (interest: string) => {
        try {
          const image = await getRandomPhoto(interest);
          if (image) {
            console.log(`  ✅ Topic image for ${interest}: ${image.photographer}`);
            return {
              topic: interest,
              imageUrl: image.url,
              imageAlt: image.alt || `${interest} news`,
              photographer: image.photographer,
              photographerUrl: image.photographerUrl,
            };
          }
        } catch (error) {
          console.log(`  ⚠️  Failed to get image for topic ${interest}`);
        }
        return null;
      })
    );

    const validTopicImages = topicImages.filter((img): img is NonNullable<typeof img> => img !== null);
    console.log(`✅ Fetched ${validTopicImages.length}/${profile.policyInterests.length} topic images`);

    // 6. Save articles to database (without individual images)
    console.log(`💾 Saving ${freshArticles.length} articles to database...`);

    const newsArticleInputs: NewsArticleInput[] = freshArticles.map(article => ({
      title: article.title,
      url: article.url,
      summary: article.summary || '',
      source: article.source || 'Unknown',
      publishedDate: article.publishedDate || new Date().toISOString(),
      relevantTopics: article.relevantTopics || [],
    }));

    let savedArticles;
    try {
      savedArticles = await saveNewsArticles(newsArticleInputs);
      console.log(`✅ Saved ${savedArticles.length} articles to database`);
    } catch (saveError: any) {
      console.error('Failed to save articles to database (non-fatal):', saveError.message);
      // If save fails, return fresh articles anyway
      savedArticles = freshArticles.map((article, index) => ({
        id: `temp-${index}`,
        ...article,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }

    // 7. Return articles with topic header images
    const latency = Date.now() - startTime;
    console.log(`✅ Served ${savedArticles.length} fresh articles with ${validTopicImages.length} topic images (${latency}ms)`);

    // Convert to API format
    const apiArticles = savedArticles.map(article => ({
      title: article.title,
      url: article.url,
      summary: article.summary,
      source: article.source,
      publishedDate: article.publishedDate,
      relevantTopics: article.relevantTopics,
    }));

    return NextResponse.json({
      success: true,
      data: apiArticles,
      topicImages: validTopicImages, // Topic header images for frontend
      meta: {
        total: apiArticles.length,
        cached: false,
        cacheSource: 'Fresh fetch (saved to database)',
        personalized: true,
        interests: profile.policyInterests,
        state: profile.location?.state,
        district: profile.location?.district,
        latency,
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
