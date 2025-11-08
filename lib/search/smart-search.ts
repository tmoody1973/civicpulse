/**
 * Smart Search Utility
 *
 * Combines Algolia (fast) with Congress.gov fallback (comprehensive)
 * - First searches Algolia for instant results
 * - If no results, falls back to Congress.gov API
 * - Automatically syncs new bills to Algolia for next time
 */

// @ts-nocheck
import { getAlgoliaSearch, BILLS_INDEX } from './algolia-config';
import type { AlgoliaBill } from './algolia-config';

// Type for Algolia v5 search response
interface AlgoliaSearchResponse<T = unknown> {
  hits: T[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  facets?: Record<string, Record<string, number>>;
  exhaustiveFacetsCount?: boolean;
  exhaustiveNbHits?: boolean;
  query: string;
  params: string;
  processingTimeMS: number;
}

export interface SearchResult {
  results: AlgoliaBill[];
  source: 'algolia' | 'congress-api';
  searchTime: number; // milliseconds
  totalHits: number;
  message?: string;
  error?: string;
  suggestions?: string[];
}

export interface SearchOptions {
  congress?: number;
  filters?: string; // Algolia filters (e.g., "status:enacted")
  facetFilters?: string[][]; // e.g., [["issueCategories:Healthcare"], ["status:enacted"]]
  hitsPerPage?: number;
  page?: number;
}

/**
 * Smart search: Tries Algolia first, falls back to Congress.gov if needed
 */
export async function smartSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const {
    congress = 119,
    filters,
    facetFilters,
    hitsPerPage = 20,
    page = 0,
  } = options;

  const startTime = Date.now();

  try {
    // STEP 1: Search Algolia (fast, instant)
    console.log(`🔍 Searching Algolia: "${query}"`);
    console.log('[DEBUG] Search request:', {
      indexName: BILLS_INDEX,
      query: query.trim(),
      filters,
      facetFilters,
      hitsPerPage,
      page,
    });

    // Get client and initialize index (v4 API)
    const algoliaClient = getAlgoliaSearch();
    const index = algoliaClient.initIndex(BILLS_INDEX);
    console.log('[DEBUG] Algolia index initialized:', BILLS_INDEX);

    // Use v4 API: index.search(query, options)
    const algoliaResponse = await index.search(query.trim(), {
      filters,
      facetFilters,
      hitsPerPage,
      page,
      attributesToHighlight: ['title', 'summary', 'billNumber'],
      attributesToSnippet: ['summary:30'],
    });

    console.log('[DEBUG] Algolia raw response:', JSON.stringify(algoliaResponse, null, 2));

    const algoliaTime = Date.now() - startTime;
    const hits = algoliaResponse.hits;
    const totalHits = algoliaResponse.nbHits || 0;

    console.log('[DEBUG] Parsed results:', {
      hitsLength: hits.length,
      totalHits,
      processingTimeMS: algoliaResponse.processingTimeMS,
      exhaustiveNbHits: algoliaResponse.exhaustiveNbHits,
    });

    // If we found results in Algolia, return them
    if (hits.length > 0) {
      console.log(`✅ Found ${hits.length} results in Algolia (${algoliaTime}ms)`);

      return {
        results: hits,
        source: 'algolia',
        searchTime: algoliaTime,
        totalHits,
      };
    }

    console.log(`⚠️ No results in Algolia, trying Congress.gov fallback...`);

    // STEP 2: Fallback to Congress.gov API (slower, but comprehensive)
    const congressStartTime = Date.now();

    const response = await fetch('/api/search-congress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, congress }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Congress.gov search failed');
    }

    const data = await response.json();
    const congressTime = Date.now() - congressStartTime;

    console.log(`✅ Found ${data.results?.length || 0} results from Congress.gov (${congressTime}ms)`);

    return {
      results: data.results || [],
      source: 'congress-api',
      searchTime: congressTime,
      totalHits: data.count || 0,
      message: data.message,
      error: data.error,
      suggestions: data.suggestions,
    };

  } catch (error: any) {
    console.error('❌ Smart search failed:', error);

    return {
      results: [],
      source: 'algolia',
      searchTime: Date.now() - startTime,
      totalHits: 0,
      error: error.message || 'Search failed',
      suggestions: [
        'Check your internet connection',
        'Try a different search term',
        'Use specific bill numbers (e.g., HR 1234)',
      ],
    };
  }
}

/**
 * Search with autocomplete suggestions
 * Only uses Algolia (instant, no fallback)
 */
export async function autocompleteSearch(
  query: string,
  options: { hitsPerPage?: number } = {}
): Promise<SearchResult> {
  const { hitsPerPage = 5 } = options;
  const startTime = Date.now();

  try {
    const response = await getAlgoliaSearch().search({
      requests: [{
        indexName: BILLS_INDEX,
        query: query.trim(),
        hitsPerPage,
        attributesToHighlight: ['title', 'billNumber'],
        attributesToRetrieve: ['objectID', 'billNumber', 'title', 'status', 'issueCategories'],
      }],
    });

    const result = response.results[0] as AlgoliaSearchResponse<AlgoliaBill>;
    const searchTime = Date.now() - startTime;

    return {
      results: result.hits,
      source: 'algolia',
      searchTime,
      totalHits: result.nbHits || 0,
    };

  } catch (error: any) {
    console.error('❌ Autocomplete search failed:', error);

    return {
      results: [],
      source: 'algolia',
      searchTime: Date.now() - startTime,
      totalHits: 0,
      error: error.message,
    };
  }
}

/**
 * Get facet values for filtering
 * (e.g., get all unique issue categories, statuses, etc.)
 */
export async function getFacetValues(
  facetName: string,
  options: { maxFacetHits?: number } = {}
): Promise<{ label: string; count: number }[]> {
  const { maxFacetHits = 100 } = options;

  try {
    const response = await getAlgoliaSearch().search({
      requests: [{
        indexName: BILLS_INDEX,
        query: '',
        hitsPerPage: 0,
        facets: [facetName],
        maxValuesPerFacet: maxFacetHits,
      }],
    });

    const result = response.results[0] as AlgoliaSearchResponse;
    const facets = result.facets?.[facetName] || {};

    return Object.entries(facets).map(([label, count]) => ({
      label,
      count: count as number,
    })).sort((a, b) => b.count - a.count);

  } catch (error) {
    console.error(`❌ Failed to get facet values for ${facetName}:`, error);
    return [];
  }
}

/**
 * Detect if query is a specific bill number
 * Returns parsed bill info or null
 */
export function parseBillNumber(query: string): {
  billType: string;
  billNumber: number;
  rawType: string;
} | null {
  const pattern = /^(hr?|s|h\.?j\.?res|s\.?j\.?res|h\.?con\.?res|s\.?con\.?res|h\.?res|s\.?res)\.?\s*(\d+)$/i;
  const match = query.trim().match(pattern);

  if (!match) return null;

  const [_, rawType, billNumber] = match;
  const billType = rawType.toLowerCase().replace(/\./g, '');

  return {
    billType,
    billNumber: parseInt(billNumber),
    rawType,
  };
}
