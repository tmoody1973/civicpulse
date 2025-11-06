/**
 * Test endpoint to debug Algolia search on production
 * This directly tests the Algolia SDK without our abstraction layers
 */

// @ts-nocheck
import { NextResponse } from 'next/server';
import algoliasearch from 'algoliasearch';

export async function GET() {
  try {
    // Get env vars
    const appId = process.env.ALGOLIA_APP_ID || process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
    const apiKey = process.env.ALGOLIA_ADMIN_API_KEY || process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;

    console.log('[Test Algolia] Environment check:', {
      hasAppId: !!appId,
      appIdStart: appId?.substring(0, 8),
      hasApiKey: !!apiKey,
      apiKeyStart: apiKey?.substring(0, 10),
    });

    if (!appId || !apiKey) {
      return NextResponse.json({
        error: 'Missing credentials',
        hasAppId: !!appId,
        hasApiKey: !!apiKey,
      }, { status: 500 });
    }

    // Create client
    const client = algoliasearch(appId, apiKey);

    console.log('[Test Algolia] Client created, searching...');

    // Simple search
    // @ts-ignore - algolia API type mismatch
    const response = await client.search({
      requests: [{
        indexName: 'bills',
        query: 'healthcare',
        hitsPerPage: 5,
      }],
    });

    const result = response.results[0] as any;

    console.log('[Test Algolia] Search response:', {
      nbHits: result.nbHits,
      hitsLength: result.hits?.length,
      processingTimeMS: result.processingTimeMS,
    });

    return NextResponse.json({
      success: true,
      appIdUsed: appId?.substring(0, 8) + '...',
      apiKeyUsed: apiKey?.substring(0, 10) + '...',
      nbHits: result.nbHits,
      hitsCount: result.hits?.length || 0,
      firstHit: result.hits?.[0] ? {
        billNumber: result.hits[0].billNumber,
        title: result.hits[0].title,
      } : null,
      processingTimeMS: result.processingTimeMS,
    });

  } catch (error: any) {
    console.error('[Test Algolia] Error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
