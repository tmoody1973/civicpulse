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
import {
  getTopicImages,
  getMissingTopicImages,
  saveTopicImages,
  initTopicImagesTable,
} from '@/lib/db/topic-images';
import { inngest } from '@/src/inngest/client';

// Set a 20-second timeout for Netlify (26s limit)
const API_TIMEOUT_MS = 20000;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Initialize topic images table on first use
    try {
      initTopicImagesTable();
    } catch (err) {
      console.warn('Topic images table may already exist:', err);
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const useInngest = searchParams.get('inngest') === 'true'; // Use Inngest + Perplexity

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

    // 3. Check database first (articles created in last 24 hours - shared pool)
    console.log(`🔍 Checking database for recent articles (shared pool)`);

    let cachedArticles: any[] = [];

    try {
      cachedArticles = await getRecentNewsArticles(
        profile.policyInterests,
        24 * 60 * 60 * 1000, // 24 hour cache (shared pool refreshes every 6 hours)
        limit
      );
    } catch (dbError: any) {
      console.warn('Database read failed (non-fatal):', dbError.message);
    }

    // If we have cached articles, return them (even if less than limit)
    if (!forceRefresh && cachedArticles.length > 0) {
      const latency = Date.now() - startTime;
      console.log(`✅ Serving ${cachedArticles.length} articles from database (${latency}ms)`);

      // Get topic images from Netlify Blobs
      const topicImagesFromDb = await getTopicImages(profile.policyInterests);
      console.log(`📸 Retrieved ${topicImagesFromDb.length}/${profile.policyInterests.length} topic images from Netlify Blobs`);

      // Convert to API format
      const topicImages = topicImagesFromDb.map(img => ({
        topic: img.topic,
        imageUrl: img.imageUrl,
        imageAlt: img.imageAlt,
        photographer: img.photographer,
        photographerUrl: img.photographerUrl,
      }));

      // Convert database format to API format with imageUrl
      const apiArticles = cachedArticles.map(article => ({
        title: article.title,
        url: article.url,
        summary: article.summary,
        source: article.source,
        publishedDate: article.publishedDate,
        imageUrl: article.imageUrl,
        relevantTopics: article.relevantTopics,
      }));

      return NextResponse.json({
        success: true,
        data: apiArticles,
        topicImages,
        meta: {
          total: apiArticles.length,
          cached: true,
          cacheSource: 'Database (Perplexity via Inngest) + Netlify Blobs',
          personalized: true,
          interests: profile.policyInterests,
          state: profile.location?.state,
          district: profile.location?.district,
          latency
        }
      });
    }

    // 4. Database empty or force refresh → Trigger shared news pool refresh
    console.log(`⚠️  News pool is empty or needs refresh`);

    try {
      // Trigger the scheduled refresh function manually (on-demand)
      await inngest.send({
        name: 'news/refresh-pool',
        data: {
          triggeredBy: 'api-request',
          userId: user.id,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`✅ News pool refresh triggered - pool will update in ~2 minutes`);

      // Get topic images while waiting
      const topicImagesFromDb = await getTopicImages(profile.policyInterests);

      // Return empty with helpful message
      const topicImages = topicImagesFromDb.map(img => ({
        topic: img.topic,
        imageUrl: img.imageUrl,
        imageAlt: img.imageAlt,
        photographer: img.photographer,
        photographerUrl: img.photographerUrl,
      }));

      return NextResponse.json({
        success: true,
        data: [],
        topicImages,
        meta: {
          total: 0,
          cached: false,
          message: 'News pool is being refreshed. Please check back in 2-3 minutes...',
          personalized: true,
          interests: profile.policyInterests,
          state: profile.location?.state,
          district: profile.location?.district,
          backgroundRefresh: true,
          poolRefreshing: true
        }
      });
    } catch (error: any) {
      console.error('❌ Failed to trigger news pool refresh:', error);

      // Fallback: If Inngest fails, use Brave Search as emergency fallback
      console.log(`⚠️  Inngest failed, falling back to Brave Search`);

      const freshArticles = await getPersonalizedNewsFast(
        profile.policyInterests,
        profile.location?.state,
        profile.location?.district
      );

      // 5. Get existing topic images from Netlify Blobs & fetch only missing ones
      console.log(`📸 Checking topic images for ${profile.policyInterests.length} interests...`);

      // Get existing images from Netlify Blobs
      const existingImages = await getTopicImages(profile.policyInterests);
      console.log(`  ✅ Found ${existingImages.length} existing images in Netlify Blobs`);

      // Find topics that need images
      const missingTopics = await getMissingTopicImages(profile.policyInterests);
      console.log(`  🔍 Need to fetch ${missingTopics.length} missing images`);

      // Fetch only missing topic images from Pexels
      let newTopicImages: Array<{
        topic: string;
        imageUrl: string;
        imageAlt: string;
        photographer: string;
        photographerUrl: string;
      }> = [];

      if (missingTopics.length > 0) {
        const { getRandomPhoto } = await import('@/lib/api/pexels');

        const fetchedImages = await Promise.all(
          missingTopics.map(async (interest: string) => {
            try {
              const image = await getRandomPhoto(interest);
              if (image) {
                console.log(`  ✅ Fetched topic image for ${interest}: ${image.photographer}`);
                return {
                  topic: interest,
                  imageUrl: image.url,
                  imageAlt: image.alt || `${interest} news`,
                  photographer: image.photographer,
                  photographerUrl: image.photographerUrl,
                };
              }
            } catch (error) {
              console.log(`  ⚠️  Failed to fetch image for topic ${interest}`);
            }
            return null;
          })
        );

        newTopicImages = fetchedImages.filter((img): img is NonNullable<typeof img> => img !== null);

        // Save newly fetched images to Netlify Blobs
        if (newTopicImages.length > 0) {
          await saveTopicImages(newTopicImages);
          console.log(`  💾 Saved ${newTopicImages.length} new topic images to Netlify Blobs`);
        }
      }

      // Combine existing + new images
      const allTopicImages = [
        ...existingImages.map(img => ({
          topic: img.topic,
          imageUrl: img.imageUrl,
          imageAlt: img.imageAlt,
          photographer: img.photographer,
          photographerUrl: img.photographerUrl,
        })),
        ...newTopicImages
      ];

      console.log(`✅ Total topic images: ${allTopicImages.length}/${profile.policyInterests.length}`);

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
      console.log(`✅ Served ${savedArticles.length} fresh articles with ${allTopicImages.length} topic images (${latency}ms)`);

      // Convert to API format with imageUrl
      const apiArticles = savedArticles.map(article => ({
        title: article.title,
        url: article.url,
        summary: article.summary,
        source: article.source,
        publishedDate: article.publishedDate,
        imageUrl: article.imageUrl,
        relevantTopics: article.relevantTopics,
      }));

      return NextResponse.json({
        success: true,
        data: apiArticles,
        topicImages: allTopicImages, // Topic header images for frontend
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
    }

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
