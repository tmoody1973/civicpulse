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
  // Force recompile - query database directly for user state

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

    // 2. Get user's state directly from database
    const userSql = `
      SELECT state, district, city
      FROM users
      WHERE id = '${user.id.replace(/'/g, "''")}'
      LIMIT 1
    `;

    const userResult = await executeQuery(userSql, 'users');
    const userData = userResult.rows?.[0];

    if (!userData || !userData.state) {
      console.log(`⚠️  No state found for user ${user.id}`);
      return NextResponse.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          message: 'User state not found in profile'
        }
      });
    }

    const state = userData.state;

    console.log(`🗺️  User state from database: "${state}" | district: ${userData.district || 'N/A'}`);

    if (!state) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          message: 'User state not found in profile'
        }
      });
    }

    // 3. Fetch representatives from database for user's state
    // Try both state abbreviation and full name
    const STATE_NAMES: Record<string, string> = {
      'WI': 'Wisconsin', 'CA': 'California', 'NY': 'New York', 'TX': 'Texas',
      'FL': 'Florida', 'PA': 'Pennsylvania', 'IL': 'Illinois', 'OH': 'Ohio',
      // Add more as needed
    };

    const stateName = STATE_NAMES[state] || state;
    console.log(`🔍 Querying representatives with state params: "${state}" and "${stateName}"`);

    // Escape single quotes to prevent SQL injection
    const escapedState = state.replace(/'/g, "''");
    const escapedStateName = stateName.replace(/'/g, "''");

    const sql = `
      SELECT bioguide_id, name, party, chamber, state, district, image_url, twitter_handle
      FROM representatives
      WHERE state = '${escapedState}' OR state = '${escapedStateName}'
      ORDER BY chamber DESC, name
    `;

    const queryResult = await executeQuery(sql, 'representatives');
    const allReps = queryResult.rows || [];

    console.log(`📊 Found ${allReps.length} representatives for state ${state}`);

    // Debug: Log all representatives with their Twitter handles
    if (allReps.length > 0) {
      console.log('📋 All representatives from database:');
      allReps.forEach((rep: any) => {
        console.log(`  - ${rep.name} (${rep.state}): twitter_handle = "${rep.twitter_handle || 'NULL'}"`);
      });
    } else {
      console.log('⚠️  No representatives found in database query!');
    }

    // 4. Filter representatives with Twitter handles
    const repsWithTwitter = allReps.filter((rep: any) => rep.twitter_handle && rep.twitter_handle.trim());

    console.log(`✅ After filtering, ${repsWithTwitter.length} representatives have Twitter handles`);

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
