/**
 * Personalized News API Route
 *
 * Fetches news articles tailored to user interests using Perplexity AI
 * Enriches articles with Open Graph images
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPersonalizedNews } from '@/lib/api/perplexity';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

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

    // If user has no interests, fall back to generic news
    if (!profile.policyInterests || profile.policyInterests.length === 0) {
      console.log('⚠️  User has no interests set, returning generic news');
      return NextResponse.redirect(new URL('/api/news', req.url));
    }

    // 3. Fetch fresh personalized news from Perplexity (caching temporarily disabled)
    console.log(`🔍 Fetching fresh personalized news for interests:`, profile.policyInterests);

    const articles = await getPersonalizedNews(
      profile.policyInterests,
      profile.location?.state,
      profile.location?.district
    );

    // 4. Return personalized articles with images
    return NextResponse.json({
      success: true,
      data: articles.slice(0, limit),
      meta: {
        total: articles.length,
        cached: false,
        personalized: true,
        interests: profile.policyInterests,
        state: profile.location?.state,
        district: profile.location?.district,
      },
    });

  } catch (error: any) {
    console.error('Error fetching personalized news:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch personalized news',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
