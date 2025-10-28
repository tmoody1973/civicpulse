/**
 * Unified Search API
 *
 * Three-layer hybrid search for legislation:
 * 1. Directed search (bill numbers) - <10ms SQL exact match
 * 2. Text search (keywords) - ~50ms SQL LIKE on searchable_text
 * 3. Filtered search - Algolia with facets
 * 4. Semantic search - SmartBuckets AI understanding (TODO)
 *
 * Usage:
 * - GET /api/search?q=<query>
 * - GET /api/search?q=<query>&party=Democrat&status=active
 * - GET /api/search?q=<query>&category=healthcare
 */

import { NextRequest, NextResponse } from 'next/server';
import { algoliasearch } from 'algoliasearch';

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
 * Text search: Fast SQL LIKE on searchable_text column
 * Performance: ~50ms for 10,000 bills
 */
async function textSearch(query: string, limit: number = 20) {
  try {
    const searchTerm = `%${query.toLowerCase()}%`;

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: `
          SELECT * FROM bills
          WHERE LOWER(searchable_text) LIKE '${searchTerm}'
             OR LOWER(title) LIKE '${searchTerm}'
             OR LOWER(summary) LIKE '${searchTerm}'
          ORDER BY tracking_count DESC, latest_action_date DESC
          LIMIT ${limit}
        `
      })
    });

    const data = await response.json();
    return data.rows || [];
  } catch (error) {
    console.error('Text search error:', error);
    return [];
  }
}

/**
 * Algolia search: Filtered search with facets
 * Performance: ~45ms with instant filters
 */
async function algoliaSearch(
  query: string,
  filters: {
    party?: string;
    status?: string;
    category?: string;
    state?: string;
  },
  limit: number = 20
) {
  try {
    const client = algoliasearch(
      process.env.ALGOLIA_APP_ID!,
      process.env.ALGOLIA_ADMIN_API_KEY!
    );

    // Build Algolia filter string
    const filterParts: string[] = [];
    if (filters.party) filterParts.push(`sponsor_party:"${filters.party}"`);
    if (filters.status) filterParts.push(`status:"${filters.status}"`);
    if (filters.category) filterParts.push(`issue_categories:"${filters.category}"`);
    if (filters.state) filterParts.push(`sponsor_state:"${filters.state}"`);

    const filterString = filterParts.join(' AND ');

    // Algolia v5 API
    const { results } = await client.search({
      requests: [{
        indexName: 'bills',
        query,
        filters: filterString || undefined,
        hitsPerPage: limit,
      }]
    });

    // Type assertion for search results
    const searchResult = results[0] as { hits?: any[] };
    return searchResult?.hits || [];
  } catch (error) {
    console.error('Algolia search error:', error);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const start = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');

    // Get filter parameters
    const party = searchParams.get('party');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const state = searchParams.get('state');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const hasFilters = !!(party || status || category || state);

    console.log(`🔍 Search query: "${query}" ${hasFilters ? '(with filters)' : ''}`);

    // Step 1: Check if this is a bill number (directed search)
    const billNumberMatch = isBillNumber(query);

    if (billNumberMatch) {
      console.log(`📋 Directed search: ${billNumberMatch.billType.toUpperCase()} ${billNumberMatch.billNumber}`);
      const results = await directedSearch(
        billNumberMatch.congress,
        billNumberMatch.billType,
        billNumberMatch.billNumber
      );

      const duration = Date.now() - start;
      console.log(`✅ Directed search completed in ${duration}ms, found ${results.length} result(s)`);

      return NextResponse.json({
        success: true,
        searchType: 'directed',
        query,
        results,
        meta: {
          duration,
          count: results.length,
          congress: billNumberMatch.congress,
          billType: billNumberMatch.billType,
          billNumber: billNumberMatch.billNumber
        }
      });
    }

    // Step 2: Use Algolia if filters are provided
    if (hasFilters) {
      console.log(`🔎 Algolia search with filters: party=${party}, status=${status}, category=${category}, state=${state}`);
      const results = await algoliaSearch(
        query,
        { party: party || undefined, status: status || undefined, category: category || undefined, state: state || undefined },
        limit
      );

      const duration = Date.now() - start;
      console.log(`✅ Algolia search completed in ${duration}ms, found ${results.length} result(s)`);

      return NextResponse.json({
        success: true,
        searchType: 'algolia',
        query,
        results,
        meta: {
          duration,
          count: results.length,
          limit,
          filters: { party, status, category, state }
        }
      });
    }

    // Step 3: Text search on searchable_text
    console.log(`📝 Text search: "${query}"`);
    const results = await textSearch(query, limit);

    const duration = Date.now() - start;
    console.log(`✅ Text search completed in ${duration}ms, found ${results.length} result(s)`);

    return NextResponse.json({
      success: true,
      searchType: 'text',
      query,
      results,
      meta: {
        duration,
        count: results.length,
        limit
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
