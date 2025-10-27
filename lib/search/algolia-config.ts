// Algolia search configuration for Civic Pulse
// Provides instant, typo-tolerant bill search with faceted filters

// Load environment variables (for scripts running outside Next.js)
if (typeof window === 'undefined' && !process.env.ALGOLIA_APP_ID) {
  require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
}

import { algoliasearch } from 'algoliasearch';

// Get environment variables
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const ALGOLIA_SEARCH_API_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;

if (!ALGOLIA_APP_ID) {
  throw new Error('ALGOLIA_APP_ID is not set in environment variables');
}

// Server-side client (for indexing bills)
export const algoliaAdmin = algoliasearch(
  ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_API_KEY!
);

// Client-side search client (read-only, public)
export const algoliaSearch = algoliasearch(
  ALGOLIA_APP_ID,
  ALGOLIA_SEARCH_API_KEY!
);

// Index name for congressional bills
export const BILLS_INDEX = 'bills';

// Algolia index configuration
// See: https://www.algolia.com/doc/api-reference/settings-api-parameters/
export const indexSettings = {
  // Which attributes to search in (ordered by importance)
  searchableAttributes: [
    'title',                    // Bill title (most important)
    'billNumber',               // HR 1234, S 567, etc.
    'summary',                  // Bill summary
    'sponsor.name',             // Sponsor name
    'cosponsor.names',          // Cosponsors
    'issueCategories'           // Healthcare, Climate, etc.
  ],

  // Attributes for faceted filtering (sidebar filters)
  attributesForFaceting: [
    'searchable(issueCategories)',    // Issue categories (with search)
    'billType',                       // HR, S, HJ, etc.
    'status',                         // introduced, committee, passed-house, etc.
    'sponsor.party',                  // D, R, I
    'sponsor.state',                  // CA, NY, TX, etc.
    'congress',                       // 118, 119, etc.
    'introducedDate'                  // Unix timestamp
  ],

  // Custom ranking criteria (tie-breakers after text relevance)
  customRanking: [
    'desc(impactScore)',      // Higher impact bills ranked first
    'desc(introducedDate)',   // More recent bills ranked higher
    'desc(cosponsorCount)'    // Bills with more cosponsors ranked higher
  ],

  // Attributes to highlight (shows matching text)
  attributesToHighlight: [
    'title',
    'summary',
    'billNumber'
  ],

  // Attributes to snippet (show excerpt around match)
  attributesToSnippet: [
    'summary:30'   // 30 words around match
  ],

  // Results per page
  hitsPerPage: 20,

  // Typo tolerance settings
  typoTolerance: true,
  minWordSizefor1Typo: 4,    // "helth" -> "health" (4+ chars)
  minWordSizefor2Typos: 8,   // Allow 2 typos for 8+ char words

  // Ranking formula weights
  ranking: [
    'typo',           // Fewer typos ranked higher
    'geo',            // Geo-based ranking (if enabled)
    'words',          // More matched words ranked higher
    'filters',        // Filtered results ranked higher
    'proximity',      // Words close together ranked higher
    'attribute',      // searchableAttributes order
    'exact',          // Exact matches ranked higher
    'custom'          // customRanking criteria
  ],

  // Remove exact words from ranking (too strict)
  removeWordsIfNoResults: 'allOptional' as const,

  // Distinct results (prevent duplicates)
  distinct: true,
  attributeForDistinct: 'billNumber',

  // Advanced settings
  allowTyposOnNumericTokens: false,  // "HR 123" must match exactly
  separatorsToIndex: '-',            // Index hyphens in bill numbers

  // Snippeting
  highlightPreTag: '<mark class="bg-yellow-200 dark:bg-yellow-900">',
  highlightPostTag: '</mark>',

  // Response fields
  attributesToRetrieve: [
    'objectID',
    'billNumber',
    'billType',
    'congress',
    'title',
    'summary',
    'sponsor',
    'cosponsors',
    'issueCategories',
    'status',
    'introducedDate',
    'latestAction',
    'latestActionDate',
    'impactScore',
    'url'
  ]
};

// TypeScript interface for Algolia bill record
export interface AlgoliaBill {
  objectID: string;           // Required by Algolia (use bill ID)
  billNumber: string;         // "HR 1234", "S 567"
  billType: string;           // "hr", "s", "hjres", etc.
  congress: number;           // 118, 119, etc.
  title: string;              // Bill title
  summary: string;            // Bill summary
  sponsor: {
    name: string;
    party: 'D' | 'R' | 'I' | 'Unknown';
    state: string;
    bioguideId: string;
  };
  cosponsors?: {
    names: string[];
    count: number;
    democratCount: number;
    republicanCount: number;
  };
  issueCategories: string[];  // ["Healthcare", "Economy"]
  status: 'introduced' | 'committee' | 'passed-house' | 'passed-senate' | 'enacted';
  introducedDate: number;     // Unix timestamp (for sorting)
  latestAction: string;
  latestActionDate: number;   // Unix timestamp
  impactScore: number;        // 0-100
  url: string;                // /bills/[id]
  cosponsorCount?: number;    // For custom ranking
  [key: string]: unknown;     // Index signature for Algolia compatibility
}
