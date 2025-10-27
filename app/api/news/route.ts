/**
 * News RSS Feed API Route
 *
 * Fetches news articles from The Hill RSS feeds
 * Supports filtering by feed IDs and interests
 * Can optionally store articles in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { THE_HILL_FEEDS, getFeedsForInterests } from '@/lib/rss/the-hill-feeds';
import { fetchMultipleFeeds } from '@/lib/rss/parser';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const feedIds = searchParams.get('feeds')?.split(',') || [];
    const interests = searchParams.get('interests')?.split(',') || [];
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const store = searchParams.get('store') === 'true'; // Store in database?

    let feedsToFetch = THE_HILL_FEEDS;

    // Filter by specific feed IDs
    if (feedIds.length > 0) {
      feedsToFetch = THE_HILL_FEEDS.filter(feed => feedIds.includes(feed.id));
    }
    // Or filter by interests
    else if (interests.length > 0) {
      feedsToFetch = getFeedsForInterests(interests);
    }

    console.log(`📰 Fetching ${feedsToFetch.length} feeds:`, feedsToFetch.map(f => f.name));

    // Fetch all feeds in parallel
    const articles = await fetchMultipleFeeds(feedsToFetch);

    // Store in database if requested
    if (store) {
      const backendUrl = process.env.RAINDROP_SERVICE_URL;
      if (backendUrl) {
        let storedCount = 0;
        for (const article of articles) {
          try {
            // Generate unique ID from URL
            const id = crypto.createHash('md5').update(article.link).digest('hex');

            await fetch(`${backendUrl}/api/rss-articles`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id,
                feedId: article.source.toLowerCase().replace(/\s+/g, '-'),
                title: article.title,
                description: article.description,
                url: article.link,
                author: article.author,
                publishedAt: article.pubDate,
                imageUrl: article.imageUrl,
                categories: [], // Could extract from article if available
              }),
            });
            storedCount++;
          } catch (err) {
            console.warn(`Failed to store article ${article.title}:`, err);
          }
        }
        console.log(`💾 Stored ${storedCount}/${articles.length} articles in database`);
      } else {
        console.warn('⚠️  RAINDROP_SERVICE_URL not set - skipping database storage');
      }
    }

    // Limit results
    const limitedArticles = articles.slice(0, limit);

    console.log(`✅ Retrieved ${limitedArticles.length} articles`);

    return NextResponse.json({
      success: true,
      data: limitedArticles,
      meta: {
        total: limitedArticles.length,
        feeds: feedsToFetch.map(f => ({ id: f.id, name: f.name })),
        stored: store,
      },
    });
  } catch (error: any) {
    console.error('Error fetching news feeds:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch news feeds',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
