/**
 * Background Cron Job: Pre-fetch Personalized News
 *
 * Runs at 6 AM and 6 PM daily (UTC) to pre-populate cache
 * with fresh news for all active users
 *
 * Schedule: 0 6,18 * * * (configured in netlify.toml)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPersonalizedNewsFast } from '@/lib/api/cerebras-tavily';
import { enrichArticlesWithImages } from '@/lib/api/perplexity';
import { storeArticlesInCache, cleanupExpiredArticles } from '@/lib/news/cache';

interface UserProfile {
  userId: string;
  policyInterests: string;
  locationState?: string;
  locationDistrict?: string;
}

/**
 * Get SQL client (must be implemented with actual Raindrop SDK)
 */
async function getSqlClient() {
  // TODO: Import from actual Raindrop SDK
  throw new Error('Raindrop SQL client not yet configured');
}

/**
 * GET /api/cron/prefetch-news
 *
 * Authenticated via CRON_SECRET header
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // 1. Verify authorization (cron secret)
  const authHeader = req.headers.get('Authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedAuth) {
    console.error('❌ Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🔄 Starting news pre-fetch cron job');

  try {
    // 2. Cleanup expired articles first
    const cleanedCount = await cleanupExpiredArticles();
    console.log(`🧹 Cleaned up ${cleanedCount} expired articles`);

    // 3. Get all users with preferences
    const sql = await getSqlClient();
    const users = await sql.query<UserProfile>(`
      SELECT
        user_id as userId,
        policy_interests as policyInterests,
        location_state as locationState,
        location_district as locationDistrict
      FROM user_profiles
      WHERE policy_interests IS NOT NULL
      AND json_array_length(policy_interests) > 0
    `);

    console.log(`📊 Found ${users.length} users with preferences`);

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users to process',
        processed: 0
      });
    }

    // 4. Batch process (10 concurrent to respect API rate limits)
    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(users.length / batchSize);

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} users)`);

      const results = await Promise.allSettled(
        batch.map(async (user) => {
          try {
            const interests = JSON.parse(user.policyInterests);

            // Fetch personalized news (Tavily + Cerebras - faster!)
            const rawArticles = await getPersonalizedNewsFast(
              interests,
              user.locationState,
              user.locationDistrict
            );

            // Enrich with images
            const articles = await enrichArticlesWithImages(rawArticles);

            // Store in cache (SmartSQL + SmartMemory)
            await storeArticlesInCache(user.userId, articles);

            console.log(`  ✅ User ${user.userId}: ${articles.length} articles cached`);
            return { userId: user.userId, count: articles.length };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`  ❌ User ${user.userId} failed:`, errorMessage);
            throw new Error(errorMessage);
          }
        })
      );

      // Count successes and failures
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
          errors.push({
            userId: batch[index].userId,
            error: result.reason.message || 'Unknown error'
          });
        }
      });

      // Add delay between batches to respect rate limits (2 seconds)
      if (i + batchSize < users.length) {
        console.log('⏳ Waiting 2s before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 5. Calculate stats
    const duration = Date.now() - startTime;
    const successRate = ((successCount / users.length) * 100).toFixed(1);

    console.log(`✅ Pre-fetch complete: ${successCount} success, ${errorCount} errors in ${duration}ms`);
    console.log(`📈 Success rate: ${successRate}%`);

    // 6. Return results
    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: users.length,
        successful: successCount,
        failed: errorCount,
        successRate: `${successRate}%`,
        durationMs: duration,
        cleanedArticles: cleanedCount
      },
      errors: errorCount > 0 ? errors.slice(0, 10) : undefined // Limit error list to 10
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Cron job failed:', error);

    return NextResponse.json(
      {
        error: 'Pre-fetch failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/prefetch-news
 *
 * Allows manual trigger with user-specific filtering
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userIds, force = false } = body;

    console.log(`🔄 Manual pre-fetch triggered for ${userIds?.length || 'all'} user(s)`);

    // If specific users provided, only process those
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      let successCount = 0;
      const errors: Array<{ userId: string; error: string }> = [];

      for (const userId of userIds) {
        try {
          // Fetch user profile
          const sql = await getSqlClient();
          const users = await sql.query<UserProfile>(`
            SELECT
              user_id as userId,
              policy_interests as policyInterests,
              location_state as locationState,
              location_district as locationDistrict
            FROM user_profiles
            WHERE user_id = ?
          `, [userId]);

          if (users.length === 0) {
            throw new Error('User not found');
          }

          const user = users[0];
          const interests = JSON.parse(user.policyInterests);

          // Fetch and cache (Tavily + Cerebras)
          const rawArticles = await getPersonalizedNewsFast(
            interests,
            user.locationState,
            user.locationDistrict
          );

          const articles = await enrichArticlesWithImages(rawArticles);

          await storeArticlesInCache(user.userId, articles);
          successCount++;

          console.log(`✅ Cached ${articles.length} articles for user ${userId}`);
        } catch (error) {
          errors.push({
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        success: true,
        processed: userIds.length,
        successful: successCount,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // Otherwise, redirect to GET (full pre-fetch)
    return GET(req);

  } catch (error) {
    console.error('Manual pre-fetch error:', error);
    return NextResponse.json(
      {
        error: 'Manual pre-fetch failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
