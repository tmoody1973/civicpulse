import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { addNewsJob } from '@/lib/queue/news-queue';

/**
 * POST /api/news/queue
 * Queue personalized news generation for authenticated user
 *
 * Features:
 * - Brave Search API for fast news aggregation
 * - Pexels API for topic images
 * - Background processing (no timeout constraints)
 * - Returns job ID immediately for status polling
 *
 * Target: 20-30s processing time
 */

const requestSchema = z.object({
  interests: z.array(z.string()).optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
  forceRefresh: z.boolean().optional().default(false),
});

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
    const { interests, state, district, limit, forceRefresh } = requestSchema.parse(body);

    // 3. Get user interests from profile if not provided
    let userInterests = interests;
    if (!userInterests || userInterests.length === 0) {
      const { executeQuery } = await import('@/lib/db/client');
      const result = await executeQuery(
        `SELECT interests FROM users WHERE id = '${user.id.replace(/'/g, "''")}'`,
        'users'
      );

      if (result.rows[0]?.interests) {
        try {
          userInterests = typeof result.rows[0].interests === 'string'
            ? JSON.parse(result.rows[0].interests)
            : result.rows[0].interests;
        } catch (error) {
          console.warn('Failed to parse user interests:', error);
          userInterests = [];
        }
      }
    }

    // Default to general interests if none provided
    if (!userInterests || userInterests.length === 0) {
      userInterests = ['Politics', 'Healthcare', 'Education'];
    }

    // 4. Check for cached news (unless force refresh)
    if (!forceRefresh) {
      const { getCachedNews } = await import('@/lib/news/cache');
      const cached = await getCachedNews(user.id, userInterests, limit);

      if (cached && cached.length > 0) {
        console.log(`✅ Found ${cached.length} cached articles for user ${user.id}`);
        return NextResponse.json({
          success: true,
          articles: cached,
          cached: true,
          message: 'Using cached news from today',
        });
      }
    }

    // 5. Add job to queue for background processing
    console.log(`📰 Queueing news generation for user ${user.id}`);
    console.log(`   Interests: ${userInterests.join(', ')}`);
    console.log(`   Location: ${state || 'N/A'}, District: ${district || 'N/A'}`);

    const jobId = await addNewsJob({
      userId: user.id,
      userEmail: user.email,
      interests: userInterests,
      state,
      district,
      limit,
      forceRefresh,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Job ${jobId} added to queue in ${duration}ms`);

    // 6. Return job ID immediately for status polling
    return NextResponse.json({
      success: true,
      jobId,
      message: 'News generation started in background',
      statusUrl: `/api/news/status/${jobId}`,
      estimatedDuration: '20-30 seconds',
    });

  } catch (error) {
    console.error('❌ News queue error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Provide specific error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Redis connection timeout. Please try again.' },
          { status: 503 }
        );
      }

      if (error.message.includes('validation')) {
        return NextResponse.json(
          { error: 'Invalid input parameters', details: errorMessage },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to queue news generation', details: errorMessage },
      { status: 500 }
    );
  }
}
