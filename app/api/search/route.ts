/**
 * Unified Search API
 *
 * AI-powered search for legislation:
 * 1. Bill numbers (HR 1234) → SQL exact match (instant)
 * 2. Everything else → SmartBuckets AI semantic search (~5s)
 *
 * SmartBuckets provides:
 * - Concept understanding ("climate change" finds related bills)
 * - Comprehensive results (finds all relevant legislation)
 * - AI-powered relevance ranking
 *
 * Usage:
 * - GET /api/search?q=<query>
 * - GET /api/search?q=<query>&layer=semantic (force semantic)
 * - GET /api/search?q=<query>&billType=hr (with filters)
 */

import { NextRequest, NextResponse } from 'next/server';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

/**
 * Detect if query is a bill number (directed search)
 * Examples: "HR 1234", "S 456", "H.R. 789", "hr123"
 */
function isBillNumber(query: string): { congress: number; billType: string; billNumber: number } | null {
  const cleaned = query.trim().toUpperCase().replace(/[.\s-]/g, '');

  // Match patterns like: HR1234, S456, HJRES12, SJRES34
  const match = cleaned.match(/^(HR|S|HJRES|SJRES|HCONRES|SCONRES|HRES|SRES)(\d+)$/);

  if (match) {
    const billType = match[1].toLowerCase();
    const billNumber = parseInt(match[2], 10);

    // Default to current congress (119)
    return { congress: 119, billType, billNumber };
  }

  return null;
}

/**
 * Directed search: Exact bill number lookup
 * Performance: <10ms
 */
async function directedSearch(congress: number, billType: string, billNumber: number) {
  try {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: `
          SELECT * FROM bills
          WHERE congress = ${congress}
            AND bill_type = '${billType}'
            AND bill_number = ${billNumber}
          LIMIT 1
        `
      })
    });

    const data = await response.json();
    return data.rows || [];
  } catch (error) {
    console.error('Directed search error:', error);
    return [];
  }
}


/**
 * SmartBuckets semantic search: AI understanding
 * Performance: ~200-500ms (includes embedding generation)
 */
async function semanticSearch(query: string, limit: number = 20) {
  try {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/smartbucket/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`SmartBuckets search failed: ${response.statusText}`);
    }

    const data: any = await response.json();
    const rawResults: any[] = data.results || [];

    // Normalize SmartBuckets results to match SQL format
    // SmartBuckets returns chunk data like: { source: 'bills/119/hr5371.txt', text: '...' }
    const normalizedResults = rawResults.map((chunk: any) => {
      // Parse source like "bills/119/hr5371.txt"
      const sourceMatch = chunk.source?.match(/bills\/(\d+)\/([a-z]+)(\d+)\.txt$/i);

      if (!sourceMatch) {
        console.warn('Could not parse SmartBucket source:', chunk.source);
        return null;
      }

      const congress = parseInt(sourceMatch[1], 10);
      const bill_type = sourceMatch[2].toLowerCase();
      const bill_number = parseInt(sourceMatch[3], 10);

      // Extract title from text (usually starts with "Title: ")
      const titleMatch = chunk.text?.match(/Title:\s*(.+?)(?:\n|$)/);
      const title = titleMatch ? titleMatch[1] : chunk.text?.substring(0, 100) || 'No title';

      // Generate a unique ID
      const id = `${congress}-${bill_type}-${bill_number}`;

      return {
        id,
        bill_number,
        bill_type,
        congress,
        title,
        summary: chunk.text?.substring(0, 500) || null, // First 500 chars as summary
        status: 'introduced', // Default status
        issue_categories: null,
        impact_score: Math.round((1 - chunk.score) * 100) || 50, // Convert score to impact score
        latest_action_date: null,
        latest_action_text: null,
        sponsor_name: null,
        sponsor_party: null,
        sponsor_state: null,
        relevance_score: chunk.score,
      };
    }).filter((result: any) => result !== null); // Remove nulls from failed parses

    return {
      results: normalizedResults,
      total: data.pagination?.total || normalizedResults.length,
    };
  } catch (error) {
    console.error('Semantic search error:', error);
    return { results: [], total: 0 };
  }
}

export async function GET(req: NextRequest) {
  const start = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');
    const layerParam = searchParams.get('layer'); // explicit layer selection

    // Get filter parameters
    const party = searchParams.get('party');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const state = searchParams.get('state');
    const billType = searchParams.get('billType');
    const congress = searchParams.get('congress');
    const hasFullText = searchParams.get('hasFullText');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const hasFilters = !!(party || status || category || state || billType || congress || hasFullText);

    console.log(`🔍 Search query: "${query}" ${hasFilters ? '(with filters)' : ''} ${layerParam ? `[layer: ${layerParam}]` : '[auto]'}`);

    // Explicit layer selection
    if (layerParam === 'semantic') {
      console.log(`🤖 Semantic search (explicit): "${query}"`);
      const { results, total } = await semanticSearch(query, limit);

      const duration = Date.now() - start;
      console.log(`✅ Semantic search completed in ${duration}ms, found ${results.length} result(s)`);

      return NextResponse.json({
        success: true,
        searchType: 'semantic',
        layer: 'smartbuckets',
        query,
        results,
        meta: {
          duration,
          count: results.length,
          total,
          limit,
          strategy: 'SmartBuckets AI semantic search',
        }
      });
    }

    // Step 1: Check if this is a bill number (exact match - instant)
    const billNumberMatch = isBillNumber(query);

    if (billNumberMatch && !hasFilters && !layerParam) {
      console.log(`📋 SQL exact search: ${billNumberMatch.billType.toUpperCase()} ${billNumberMatch.billNumber}`);
      const results = await directedSearch(
        billNumberMatch.congress,
        billNumberMatch.billType,
        billNumberMatch.billNumber
      );

      const duration = Date.now() - start;
      console.log(`✅ SQL search completed in ${duration}ms, found ${results.length} result(s)`);

      return NextResponse.json({
        success: true,
        searchType: 'sql',
        layer: 'sql',
        query,
        results,
        meta: {
          duration,
          count: results.length,
          congress: billNumberMatch.congress,
          billType: billNumberMatch.billType,
          billNumber: billNumberMatch.billNumber,
          strategy: 'SQL exact match',
        }
      });
    }

    // Step 2: Everything else uses AI semantic search (default)
    console.log(`🤖 AI semantic search: "${query}" ${hasFilters ? '(with filters - note: filters not supported in semantic search yet)' : ''}`);
    const { results, total } = await semanticSearch(query, limit);

    const duration = Date.now() - start;
    console.log(`✅ Semantic search completed in ${duration}ms, found ${results.length} result(s)`);

    return NextResponse.json({
      success: true,
      searchType: 'semantic',
      layer: 'smartbuckets',
      query,
      results,
      meta: {
        duration,
        count: results.length,
        total,
        limit,
        strategy: 'SmartBuckets AI semantic search (default)',
      }
    });

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}
