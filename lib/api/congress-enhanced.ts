/**
 * Enhanced Congress.gov API Client for Algolia Integration
 *
 * Extends the base congress.ts client with features needed for Algolia bill search:
 * - Batch fetching with pagination
 * - Cosponsor data
 * - Issue category classification
 * - Impact scoring
 * - Full metadata for search indexing
 */

import {
  fetchRecentBills,
  fetchBillDetails,
  searchBills,
  type Bill as BaseBill,
} from './congress';

// Enhanced bill interface with Algolia-specific fields
export interface EnhancedBill extends BaseBill {
  // Cosponsors
  cosponsors?: {
    names: string[];
    count: number;
    democratCount: number;
    republicanCount: number;
  };

  // Classification
  issueCategories: string[];
  impactScore: number;

  // Sponsor details
  sponsorParty: 'D' | 'R' | 'I' | 'Unknown';
  sponsorState: string;

  // Status categorization
  status: 'introduced' | 'committee' | 'passed-house' | 'passed-senate' | 'enacted';

  // Full bill ID for linking
  id: string; // e.g., "hr1234-118"
}

/**
 * Classify bill into issue categories based on title and summary
 * Uses keyword matching - can be enhanced with Claude AI classification later
 */
function classifyIssueCategories(title: string, summary?: string): string[] {
  const text = `${title} ${summary || ''}`.toLowerCase();
  const categories: string[] = [];

  const categoryKeywords: Record<string, string[]> = {
    'Healthcare': ['health', 'medicare', 'medicaid', 'hospital', 'medical', 'insurance', 'care', 'patient'],
    'Climate': ['climate', 'environment', 'energy', 'renewable', 'carbon', 'emission', 'green', 'sustainability'],
    'Technology': ['technology', 'internet', 'cyber', 'digital', 'ai', 'artificial intelligence', 'data', 'privacy'],
    'Economy': ['economy', 'economic', 'tax', 'budget', 'fiscal', 'finance', 'trade', 'commerce'],
    'Education': ['education', 'school', 'student', 'college', 'university', 'scholarship', 'teacher'],
    'Housing': ['housing', 'affordable housing', 'rent', 'mortgage', 'homeless', 'shelter'],
    'Defense': ['defense', 'military', 'national security', 'armed forces', 'veteran', 'war'],
    'Immigration': ['immigration', 'border', 'visa', 'citizenship', 'refugee', 'asylum'],
    'Justice': ['justice', 'criminal', 'law enforcement', 'police', 'prison', 'sentencing', 'court'],
    'Infrastructure': ['infrastructure', 'transportation', 'roads', 'bridges', 'transit', 'highway'],
    'Agriculture': ['agriculture', 'farming', 'farm', 'rural', 'crop', 'livestock'],
    'Labor': ['labor', 'employment', 'worker', 'wage', 'union', 'workplace', 'job'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const hasMatch = keywords.some(keyword => text.includes(keyword));
    if (hasMatch) {
      categories.push(category);
    }
  }

  // Default category if no matches
  if (categories.length === 0) {
    categories.push('Other');
  }

  return categories;
}

/**
 * Calculate impact score (0-100) based on bill characteristics
 * Higher score = more significant/impactful bill
 */
function calculateImpactScore(bill: BaseBill, cosponsorCount: number): number {
  let score = 0;

  // Base score from bill type
  const billTypeScores: Record<string, number> = {
    'hr': 30,     // House bill
    's': 30,      // Senate bill
    'hjres': 50,  // House joint resolution (constitutional amendments)
    'sjres': 50,  // Senate joint resolution
    'hconres': 20, // House concurrent resolution
    'sconres': 20, // Senate concurrent resolution
    'hres': 10,   // House simple resolution
    'sres': 10,   // Senate simple resolution
  };

  score += billTypeScores[bill.billType.toLowerCase()] || 20;

  // Cosponsor count (more cosponsors = more support)
  if (cosponsorCount > 100) score += 30;
  else if (cosponsorCount > 50) score += 20;
  else if (cosponsorCount > 20) score += 10;
  else if (cosponsorCount > 5) score += 5;

  // Status progression
  if (bill.latestActionText.toLowerCase().includes('enacted')) {
    score += 40; // Became law
  } else if (bill.latestActionText.toLowerCase().includes('passed senate')) {
    score += 25;
  } else if (bill.latestActionText.toLowerCase().includes('passed house')) {
    score += 25;
  } else if (bill.latestActionText.toLowerCase().includes('reported') ||
             bill.latestActionText.toLowerCase().includes('committee')) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Determine bill status category from latest action
 */
function getBillStatus(latestActionText: string): EnhancedBill['status'] {
  const action = latestActionText.toLowerCase();

  if (action.includes('enacted') || action.includes('became law')) {
    return 'enacted';
  } else if (action.includes('passed senate')) {
    return 'passed-senate';
  } else if (action.includes('passed house')) {
    return 'passed-house';
  } else if (action.includes('committee') || action.includes('reported')) {
    return 'committee';
  } else {
    return 'introduced';
  }
}

/**
 * Fetch cosponsors for a bill
 */
async function fetchCosponsors(congress: number, billType: string, billNumber: number) {
  const url = `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}/cosponsors?format=json&limit=250&api_key=${process.env.CONGRESS_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const cosponsors = data.cosponsors || [];

    const names = cosponsors.map((c: any) => c.fullName);
    const democratCount = cosponsors.filter((c: any) => c.party === 'D' || c.party === 'Democratic').length;
    const republicanCount = cosponsors.filter((c: any) => c.party === 'R' || c.party === 'Republican').length;

    return {
      names,
      count: cosponsors.length,
      democratCount,
      republicanCount,
    };
  } catch (error) {
    console.warn(`Failed to fetch cosponsors for ${billType}${billNumber}:`, error);
    return null;
  }
}

/**
 * Enhance a base bill with Algolia-specific metadata
 */
export async function enhanceBill(baseBill: BaseBill, includeCosponsors = true): Promise<EnhancedBill> {
  // Fetch cosponsors (optional - can be slow for large batches)
  let cosponsors = null;
  if (includeCosponsors) {
    cosponsors = await fetchCosponsors(baseBill.congress, baseBill.billType, baseBill.billNumber);
  }

  const cosponsorCount = cosponsors?.count || 0;

  // Classify and score
  const issueCategories = classifyIssueCategories(baseBill.title, baseBill.summary);
  const impactScore = calculateImpactScore(baseBill, cosponsorCount);
  const status = getBillStatus(baseBill.latestActionText);

  // Build enhanced bill
  const enhanced: EnhancedBill = {
    ...baseBill,
    id: `${baseBill.billType}${baseBill.billNumber}-${baseBill.congress}`,
    cosponsors: cosponsors || undefined,
    issueCategories,
    impactScore,
    sponsorParty: 'Unknown', // Would need separate API call to get party
    sponsorState: '', // Would need separate API call
    status,
  };

  return enhanced;
}

/**
 * Fetch and enhance recent bills in batches
 * Useful for initial Algolia sync
 */
export async function fetchEnhancedBillsBatch(options: {
  congress?: number;
  limit?: number;
  offset?: number;
  includeCosponsors?: boolean;
}): Promise<EnhancedBill[]> {
  const {
    congress = 119, // Current Congress
    limit = 250,
    offset = 0,
    includeCosponsors = false, // Skip cosponsors for faster bulk sync
  } = options;

  console.log(`📥 Fetching bills batch: congress=${congress}, limit=${limit}, offset=${offset}`);

  // Fetch base bills
  const baseBills = await fetchRecentBills({
    congress,
    limit,
    offset,
    sort: 'updateDate+desc',
  });

  console.log(`✅ Fetched ${baseBills.length} base bills`);

  // Enhance each bill
  const enhancedBills: EnhancedBill[] = [];

  for (const baseBill of baseBills) {
    try {
      const enhanced = await enhanceBill(baseBill, includeCosponsors);
      enhancedBills.push(enhanced);

      // Rate limit: 1 req/sec
      if (includeCosponsors) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to enhance bill ${baseBill.billType}${baseBill.billNumber}:`, error);
      // Continue with next bill
    }
  }

  console.log(`✅ Enhanced ${enhancedBills.length}/${baseBills.length} bills`);

  return enhancedBills;
}

/**
 * Fetch ALL bills for a congress (full sync)
 * Fetches in batches of 250 (API max)
 */
export async function fetchAllBillsForCongress(congress: number = 119): Promise<EnhancedBill[]> {
  const allBills: EnhancedBill[] = [];
  let offset = 0;
  const batchSize = 250;

  console.log(`🚀 Starting full sync for Congress ${congress}...`);

  while (true) {
    const batch = await fetchEnhancedBillsBatch({
      congress,
      limit: batchSize,
      offset,
      includeCosponsors: false, // Too slow for full sync
    });

    if (batch.length === 0) {
      break; // No more bills
    }

    allBills.push(...batch);
    offset += batchSize;

    console.log(`📊 Progress: ${allBills.length} bills fetched`);

    // Rate limit between batches (be nice to Congress.gov API)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`✅ Full sync complete: ${allBills.length} total bills`);

  return allBills;
}

/**
 * Search bills and enhance results
 */
export async function searchEnhancedBills(query: string, options?: {
  congress?: number;
  limit?: number;
  offset?: number;
}): Promise<EnhancedBill[]> {
  const baseBills = await searchBills(query, options);

  const enhancedBills: EnhancedBill[] = [];

  for (const baseBill of baseBills) {
    const enhanced = await enhanceBill(baseBill, false); // Skip cosponsors for speed
    enhancedBills.push(enhanced);
  }

  return enhancedBills;
}
