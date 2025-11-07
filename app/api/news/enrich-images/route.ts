/**
 * Background Image Enrichment API Route
 *
 * Asynchronously enriches article images after initial response.
 * Called by personalized news API to enrich images in background.
 *
 * Flow:
 * 1. Personalized news API returns immediately with placeholders
 * 2. Triggers this endpoint asynchronously (fire-and-forget)
 * 3. This endpoint enriches images (OG → Unsplash → keep placeholder)
 * 4. Updates cache with enriched images
 * 5. Next request gets enriched images from cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { enrichArticlesWithImages } from '@/lib/api/perplexity';
import { storeArticlesInCache } from '@/lib/news/cache';
import type { PerplexityArticle } from '@/lib/api/perplexity';

// No timeout - this runs in background
export const maxDuration = 60; // 60 seconds max for Netlify

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { userId, articles } = body as {
      userId: string;
      articles: PerplexityArticle[];
    };

    if (!userId || !articles || !Array.isArray(articles)) {
      return NextResponse.json(
        { error: 'Missing userId or articles' },
        { status: 400 }
      );
    }

    console.log(`🖼️  [Background] Starting image enrichment for ${articles.length} articles (user: ${userId})`);

    // Enrich images (OG → Unsplash → keep placeholder)
    const enrichedArticles = await enrichArticlesWithImages(articles);

    const enrichedCount = enrichedArticles.filter(
      a => a.imageUrl && !a.imageUrl.includes('placeholder.com')
    ).length;

    console.log(`✅ [Background] Enriched ${enrichedCount}/${articles.length} articles with real images`);

    // Update cache with enriched images
    try {
      await storeArticlesInCache(userId, enrichedArticles);
      console.log(`💾 [Background] Updated cache with enriched images`);
    } catch (cacheError) {
      console.warn('[Background] Failed to update cache (non-fatal):', cacheError);
    }

    const latency = Date.now() - startTime;
    console.log(`✅ [Background] Image enrichment completed in ${latency}ms`);

    return NextResponse.json({
      success: true,
      enriched: enrichedCount,
      total: articles.length,
      latency,
    });

  } catch (error: any) {
    console.error('[Background] Image enrichment error:', error);
    return NextResponse.json(
      {
        error: 'Background enrichment failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
