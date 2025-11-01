/**
 * Smart Unified Search API
 *
 * Automatically routes queries for best performance and accuracy:
 * 1. Bill numbers (HR 1234) → Algolia exact match (instant, 50-200ms)
 * 2. Simple keywords + filters → Algolia keyword search (fast, 100-300ms)
 * 3. Complex questions → SmartBuckets AI semantic (slow, 6-30s)
 *
 * Search Strategies:
 * - Algolia: Fast keyword matching, great for specific terms and filters
 * - SmartBuckets: AI concept understanding, finds related bills semantically
 *
 * Usage:
 * - GET /api/search?q=<query> (auto-routes)
 * - GET /api/search?q=<query>&strategy=algolia (force fast)
 * - GET /api/search?q=<query>&strategy=semantic (force AI)
 */

import { NextRequest, NextResponse } from 'next/server';
import { smartSearch } from '@/lib/search/smart-search';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

/**
 * Determine search strategy based on query complexity
 */
function determineSearchStrategy(
  query: string,
  hasFilters: boolean,
  explicitStrategy?: string
): 'algolia' | 'semantic' | 'hybrid' {
  // Explicit strategy override
  if (explicitStrategy === 'algolia') return 'algolia';
  if (explicitStrategy === 'semantic') return 'semantic';

  // Bill numbers always use Algolia (instant)
  if (isBillNumber(query)) return 'algolia';

  // Filters work best with Algolia (indexed, fast)
  if (hasFilters) return 'algolia';

  // Short queries (1-2 words) → Algolia first
  const words = query.trim().split(/\s+/);
  if (words.length <= 2) return 'algolia';

  // Questions or complex phrases → SmartBuckets AI
  if (query.includes('?') || words.length >= 5) return 'semantic';

  // Medium complexity (3-4 words) → Hybrid (try Algolia, fall to semantic)
  return 'hybrid';
}

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
 * Search using Algolia (fast keyword matching)
 * Performance: 50-300ms
 */
async function algoliaSearch(
  query: string,
  limit: number = 20,
  page: number = 1,
  filters: {
    status?: string;
    billType?: string;
    congress?: string;
    party?: string;
    state?: string;
    category?: string;
  } = {}
) {
  try {
    // Build Algolia filter string
    const algoliaFilters: string[] = [];

    if (filters.status) {
      const statuses = filters.status.split(',').map(s => `status:${s.trim()}`);
      algoliaFilters.push(`(${statuses.join(' OR ')})`);
    }

    if (filters.billType) {
      const types = filters.billType.split(',').map(t => `billType:${t.trim()}`);
      algoliaFilters.push(`(${types.join(' OR ')})`);
    }

    if (filters.congress) {
      algoliaFilters.push(`congress:${filters.congress}`);
    }

    if (filters.party) {
      const parties = filters.party.split(',').map(p => `sponsor.party:${p.trim()}`);
      algoliaFilters.push(`(${parties.join(' OR ')})`);
    }

    if (filters.state) {
      const states = filters.state.split(',').map(s => `sponsor.state:${s.trim()}`);
      algoliaFilters.push(`(${states.join(' OR ')})`);
    }

    if (filters.category) {
      const categories = filters.category.split(',').map(c => `issueCategories:${c.trim()}`);
      algoliaFilters.push(`(${categories.join(' OR ')})`);
    }

    const searchResult = await smartSearch(query, {
      filters: algoliaFilters.join(' AND '),
      hitsPerPage: limit,
      page: page - 1, // Algolia uses 0-indexed pages
    });

    // Debug: Log first hit to see what Algolia returns
    if (searchResult.results.length > 0) {
      console.log('[DEBUG] First Algolia hit:', JSON.stringify(searchResult.results[0], null, 2));
    }

    // Transform Algolia results to match our format
    const results = searchResult.results.map((hit: any) => ({
      id: hit.objectID,
      bill_number: parseInt(hit.billNumber.match(/\d+/)?.[0] || '0'),
      bill_type: hit.billType,
      congress: hit.congress,
      title: hit.title,
      summary: hit.summary,
      status: hit.status,
      policy_area: hit.policyArea || null,
      issue_categories: hit.issueCategories,
      impact_score: hit.impactScore || 50,
      latest_action_date: hit.latestActionDate,
      latest_action_text: hit.latestActionText,
      sponsor_name: hit.sponsorName,
      sponsor_bioguide_id: hit.sponsorBioguideId,
      sponsor_party: hit.sponsorParty,
      sponsor_state: hit.sponsorState,
      sponsor_district: hit.sponsorDistrict,
      introduced_date: hit.introducedDate,
      cosponsor_count: hit.cosponsorCount || 0,
      committees: hit.committees || [],
    }));

    return {
      results,
      total: searchResult.totalHits,
      searchTime: searchResult.searchTime,
    };
  } catch (error) {
    console.error('Algolia search error:', error);
    // Fall back to empty results
    return { results: [], total: 0, searchTime: 0 };
  }
}

/**
 * Enrich SmartBuckets results with real database metadata
 */
async function enrichWithDatabaseData(results: any[]) {
  if (results.length === 0) return results;

  try {
    // Build WHERE clause to fetch all bills in batch
    const conditions = results.map(r =>
      `(congress = ${r.congress} AND bill_type = '${r.bill_type}' AND bill_number = ${r.bill_number})`
    ).join(' OR ');

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: `SELECT * FROM bills WHERE ${conditions}`
      })
    });

    const data = await response.json();
    const dbBills = data.rows || [];

    // Create lookup map by ID
    const billMap = new Map(
      dbBills.map((bill: any) => [
        `${bill.congress}-${bill.bill_type}-${bill.bill_number}`,
        bill
      ])
    );

    // Merge database data with SmartBuckets results
    return results.map(result => {
      const dbBill = billMap.get(result.id) as any;
      if (dbBill) {
        // Replace with real database data
        return {
          ...result,
          status: dbBill.status || 'introduced',
          issue_categories: dbBill.issue_categories,
          impact_score: dbBill.impact_score || result.impact_score,
          latest_action_date: dbBill.latest_action_date,
          latest_action_text: dbBill.latest_action_text,
          sponsor_name: dbBill.sponsor_name,
          sponsor_bioguide_id: dbBill.sponsor_bioguide_id,
          sponsor_party: dbBill.sponsor_party,
          sponsor_state: dbBill.sponsor_state,
          sponsor_district: dbBill.sponsor_district,
          introduced_date: dbBill.introduced_date,
          cosponsor_count: dbBill.cosponsor_count || 0,
          committees: dbBill.committees ? JSON.parse(dbBill.committees) : [],
          policy_area: dbBill.policy_area || dbBill.ai_policy_area || null,
          title: dbBill.title || result.title,
          summary: dbBill.summary || result.summary,
        };
      }
      return result;
    });
  } catch (error) {
    console.error('Database enrichment error:', error);
    // Return original results if enrichment fails
    return results;
  }
}

/**
 * Apply filters to search results
 */
function applyFilters(results: any[], filters: {
  status?: string;
  billType?: string;
  congress?: string;
  party?: string;
  state?: string;
  category?: string;
  hasFullText?: string;
}) {
  let filtered = results;

  if (filters.status) {
    const statuses = filters.status.split(',').map(s => s.trim().toLowerCase());
    filtered = filtered.filter(bill =>
      statuses.includes(bill.status?.toLowerCase() || '')
    );
  }

  if (filters.billType) {
    const types = filters.billType.split(',').map(t => t.trim().toLowerCase());
    filtered = filtered.filter(bill =>
      types.includes(bill.bill_type?.toLowerCase() || '')
    );
  }

  if (filters.congress) {
    const congressNum = parseInt(filters.congress, 10);
    filtered = filtered.filter(bill => bill.congress === congressNum);
  }

  if (filters.party) {
    const parties = filters.party.split(',').map(p => p.trim().toLowerCase());
    filtered = filtered.filter(bill =>
      parties.includes(bill.sponsor_party?.toLowerCase() || '')
    );
  }

  if (filters.state) {
    const states = filters.state.split(',').map(s => s.trim().toUpperCase());
    filtered = filtered.filter(bill =>
      states.includes(bill.sponsor_state?.toUpperCase() || '')
    );
  }

  if (filters.category) {
    const categories = filters.category.split(',').map(c => c.trim().toLowerCase());
    filtered = filtered.filter(bill => {
      const billCategories = bill.issue_categories || [];
      return categories.some(cat =>
        billCategories.some((bc: string) => bc.toLowerCase().includes(cat))
      );
    });
  }

  if (filters.hasFullText === 'true') {
    filtered = filtered.filter(bill => bill.full_text && bill.full_text.length > 0);
  }

  return filtered;
}

/**
 * SmartBuckets semantic search: AI understanding
 * Performance: ~200-500ms (includes embedding generation)
 */
async function semanticSearch(
  query: string,
  limit: number = 20,
  page: number = 1,
  filters: {
    status?: string;
    billType?: string;
    congress?: string;
    party?: string;
    state?: string;
    category?: string;
    hasFullText?: string;
  } = {}
) {
  try {
    // Fetch more results to support pagination and filtering
    // Get enough results for current page + some buffer for filtering
    const fetchLimit = Math.max(limit * page * 2, 100);

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/smartbucket/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit: fetchLimit,
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
        status: 'introduced', // Default status (will be enriched)
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

    // Enrich with real database data
    const enrichedResults = await enrichWithDatabaseData(normalizedResults);

    // Apply filters
    const filteredResults = applyFilters(enrichedResults, filters);

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const finalResults = filteredResults.slice(startIndex, endIndex);

    return {
      results: finalResults,
      total: filteredResults.length, // Total matching results after filtering
      filtered: filteredResults.length,
      page,
      totalPages: Math.ceil(filteredResults.length / limit),
    };
  } catch (error) {
    console.error('Semantic search error:', error);
    return { results: [], total: 0, filtered: 0 };
  }
}

export async function GET(req: NextRequest) {
  const start = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');
    const pageParam = searchParams.get('page');
    const strategyParam = searchParams.get('strategy'); // explicit strategy override

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
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const hasFilters = !!(party || status || category || state || billType || congress || hasFullText);

    // Determine optimal search strategy
    const strategy = determineSearchStrategy(query, hasFilters, strategyParam || undefined);

    console.log(`🔍 Search query: "${query}" ${hasFilters ? '(with filters)' : ''} [strategy: ${strategy}]`);

    const filterObj = {
      status: status || undefined,
      billType: billType || undefined,
      congress: congress || undefined,
      party: party || undefined,
      state: state || undefined,
      category: category || undefined,
      hasFullText: hasFullText || undefined,
    };

    // Route to appropriate search method
    if (strategy === 'algolia') {
      console.log(`⚡ Algolia fast search: "${query}" (page ${page})`);
      const { results, total, searchTime } = await algoliaSearch(query, limit, page, filterObj);

      const duration = Date.now() - start;
      console.log(`✅ Algolia search completed in ${duration}ms, found ${results.length} result(s)`);

      return NextResponse.json({
        success: true,
        searchType: 'algolia',
        strategy: 'algolia',
        query,
        results,
        meta: {
          duration,
          algoliaTime: searchTime,
          count: results.length,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          strategyUsed: 'Algolia fast keyword search',
          filtersApplied: hasFilters,
        }
      });
    }

    if (strategy === 'hybrid') {
      console.log(`🔄 Hybrid search (page ${page}): Trying Algolia first...`);

      // Try Algolia first
      const { results: algoliaResults, total: algoliaTotal, searchTime } = await algoliaSearch(query, limit, page, filterObj);

      // If we got good results (5+), return them
      if (algoliaResults.length >= 5) {
        const duration = Date.now() - start;
        console.log(`✅ Hybrid search (Algolia): Found ${algoliaResults.length} results in ${duration}ms`);

        return NextResponse.json({
          success: true,
          searchType: 'hybrid',
          strategy: 'algolia',
          query,
          results: algoliaResults,
          meta: {
            duration,
            algoliaTime: searchTime,
            count: algoliaResults.length,
            total: algoliaTotal,
            page,
            limit,
            totalPages: Math.ceil(algoliaTotal / limit),
            strategyUsed: 'Algolia (hybrid - sufficient results)',
            filtersApplied: hasFilters,
          }
        });
      }

      // Not enough Algolia results, try SmartBuckets
      console.log(`⚠️ Algolia returned only ${algoliaResults.length} results, trying SmartBuckets...`);
      const { results: semanticResults, total: semanticTotal, filtered, page: semanticPage, totalPages } = await semanticSearch(query, limit, page, filterObj);

      const duration = Date.now() - start;
      console.log(`✅ Hybrid search (SmartBuckets fallback): Found ${semanticResults.length} results in ${duration}ms`);

      return NextResponse.json({
        success: true,
        searchType: 'hybrid',
        strategy: 'semantic',
        query,
        results: semanticResults,
        meta: {
          duration,
          algoliaTime: searchTime,
          algoliaCount: algoliaResults.length,
          count: semanticResults.length,
          total: semanticTotal,
          filtered,
          page: semanticPage,
          limit,
          totalPages,
          strategyUsed: 'SmartBuckets AI (hybrid - Algolia insufficient)',
          filtersApplied: hasFilters,
        }
      });
    }

    // Default: Semantic search
    console.log(`🤖 SmartBuckets AI semantic search: "${query}" (page ${page})`);
    const { results, total, filtered, page: semanticPage, totalPages } = await semanticSearch(query, limit, page, filterObj);

    const duration = Date.now() - start;
    console.log(`✅ Semantic search completed in ${duration}ms, found ${results.length} result(s) ${hasFilters ? `(${filtered} after filtering)` : ''}`);

    return NextResponse.json({
      success: true,
      searchType: 'semantic',
      strategy: 'semantic',
      query,
      results,
      meta: {
        duration,
        count: results.length,
        total,
        filtered: hasFilters ? filtered : undefined,
        page: semanticPage,
        limit,
        totalPages,
        strategyUsed: 'SmartBuckets AI semantic search',
        filtersApplied: hasFilters,
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
