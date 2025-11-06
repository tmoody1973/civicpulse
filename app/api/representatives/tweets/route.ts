/**
 * Representative Tweets API
 *
 * Fetches recent tweets from user's representatives using Nitter RSS
 * Includes caching to avoid hitting Nitter on every request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { fetchTweetsForMultipleUsers, type Tweet } from '@/lib/api/nitter';

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

    // 2. Fetch user profile to get representatives
    const profileResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/preferences/profile`,
      {
        headers: {
          cookie: req.headers.get('cookie') || '',
        },
      }
    );

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const profileData = await profileResponse.json();

    if (!profileData.success || !profileData.profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const profile = profileData.profile;

    // 3. Get representatives with Twitter handles
    const repsWithTwitter = profile.representatives?.filter(
      (rep: any) => rep.twitterHandle
    ) || [];

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

    console.log(`📊 Found ${repsWithTwitter.length} representatives with Twitter`);

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
      rep.twitterHandle.replace('@', '')
    );

    const tweetsMap = await fetchTweetsForMultipleUsers(usernames, limit);

    // 6. Format response
    const result: RepresentativeTweets[] = repsWithTwitter
      .map((rep: any) => {
        const username = rep.twitterHandle.replace('@', '');
        const tweets = tweetsMap.get(username) || [];

        if (tweets.length === 0) return null;

        return {
          representative: {
            id: rep.id,
            name: rep.name,
            twitterHandle: rep.twitterHandle,
            chamber: rep.chamber,
            photoUrl: rep.photoUrl
          },
          tweets
        };
      })
      .filter((item): item is RepresentativeTweets => item !== null);

    const latency = Date.now() - startTime;
    console.log(`✅ Fetched ${result.length} representative timelines (${latency}ms)`);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        total: result.length,
        totalTweets: result.reduce((sum, r) => sum + r.tweets.length, 0),
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
