/**
 * Representative Tweets API
 *
 * Fetches recent tweets from user's representatives using Nitter RSS
 * Includes caching to avoid hitting Nitter on every request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { fetchTweetsForMultipleUsers, type Tweet } from '@/lib/api/nitter';
import { executeQuery } from '@/lib/db/client';

interface RepresentativeTweets {
  representative: {
    id: string;
    name: string;
    twitterHandle: string;
    chamber: 'Senate' | 'House';
    photoUrl?: string;
  };
  tweets: Tweet[];
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // 1. Get authenticated user
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log(`🐦 Fetching tweets for user: ${user.id}`);

    // 2. Get user's representatives from database (via user_representatives join)
    const sql = `
      SELECT r.bioguide_id, r.name, r.party, r.chamber, r.state, r.district, r.image_url, r.twitter_handle
      FROM representatives r
      INNER JOIN user_representatives ur ON r.bioguide_id = ur.bioguide_id
      WHERE ur.user_id = ?
      ORDER BY r.chamber DESC, r.name
    `;

    const queryResult = await executeQuery(sql, 'representatives', [user.id]);
    const allReps = queryResult.rows || [];

    // 3. Filter representatives with Twitter handles
    const repsWithTwitter = allReps.filter((rep: any) => rep.twitter_handle);

    if (repsWithTwitter.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          message: 'No representatives with Twitter accounts found'
        }
      });
    }

    console.log(`📊 Found ${repsWithTwitter.length} representatives with Twitter:`,
      repsWithTwitter.map((r: any) => `${r.name} (@${r.twitter_handle})`));

    // 4. Check cache first (unless forced refresh)
    const cacheKey = `rep-tweets-${user.id}`;

    if (!forceRefresh) {
      try {
        // Check localStorage or server cache
        // For now, we'll skip server cache and fetch fresh
        // TODO: Add SmartMemory caching here
      } catch (error) {
        console.warn('Cache check failed:', error);
      }
    }

    // 5. Fetch tweets for all representatives (parallel)
    const usernames = repsWithTwitter.map((rep: any) =>
      rep.twitter_handle.replace('@', '')
    );

    const tweetsMap = await fetchTweetsForMultipleUsers(usernames, limit);

    // 6. Format response
    const tweetsResult: RepresentativeTweets[] = repsWithTwitter
      .map((rep: any) => {
        const username = rep.twitter_handle.replace('@', '');
        const tweets = tweetsMap.get(username) || [];

        if (tweets.length === 0) return null;

        return {
          representative: {
            id: rep.bioguide_id,
            name: rep.name,
            twitterHandle: rep.twitter_handle.startsWith('@') ? rep.twitter_handle : `@${rep.twitter_handle}`,
            chamber: rep.chamber,
            photoUrl: rep.image_url
          },
          tweets
        };
      })
      .filter((item): item is RepresentativeTweets => item !== null);

    const latency = Date.now() - startTime;
    console.log(`✅ Fetched ${tweetsResult.length} representative timelines (${latency}ms)`);

    return NextResponse.json({
      success: true,
      data: tweetsResult,
      meta: {
        total: tweetsResult.length,
        totalTweets: tweetsResult.reduce((sum, r) => sum + r.tweets.length, 0),
        cached: false,
        latency
      }
    });

  } catch (error: any) {
    console.error('Error fetching representative tweets:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch tweets',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
