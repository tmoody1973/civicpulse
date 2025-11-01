/**
 * Congress.gov API Utilities
 *
 * Handles fetching legislation data for congressional members with timeout handling
 * and error recovery.
 */

// Load environment variables for standalone script usage
import { config } from 'dotenv';
import { resolve } from 'path';

// Try to load .env.local if running outside Next.js context (e.g., in scripts)
if (!process.env.NEXT_RUNTIME) {
  config({ path: resolve(process.cwd(), '.env.local') });
}

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_LIMIT = 10; // Show 10 bills per page (pagination handles more)

export interface CongressBill {
  id: string;
  congress: number;
  bill_number: string;
  bill_type: string;
  title: string;
  introduced_date: string;
  latest_action_date: string;
  latest_action_text: string;
  status: string;
  policy_area?: string;
}

interface CongressApiResponse {
  sponsoredLegislation?: any[];
  cosponsoredLegislation?: any[];
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, timeout: number = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Transform Congress.gov bill item to our format
 */
function transformBill(item: any): CongressBill {
  return {
    id: `${item.congress}-${item.type?.toLowerCase()}-${item.number}`,
    congress: item.congress,
    bill_number: item.number,
    bill_type: item.type?.toLowerCase(),
    title: item.title,
    introduced_date: item.introducedDate,
    latest_action_date: item.latestAction?.actionDate,
    latest_action_text: item.latestAction?.text || 'Introduced',
    status: item.latestAction?.text || 'Introduced',
    policy_area: item.policyArea?.name,
  };
}

/**
 * Fetch sponsored legislation for a member
 */
export async function fetchSponsoredBills(
  bioguideId: string,
  options: { limit?: number; timeout?: number } = {}
): Promise<CongressBill[]> {
  const { limit = DEFAULT_LIMIT, timeout = DEFAULT_TIMEOUT } = options;

  if (!CONGRESS_API_KEY) {
    throw new Error('CONGRESS_API_KEY environment variable is not set');
  }

  console.log(`📋 Fetching up to ${limit} sponsored bills for ${bioguideId}...`);

  try {
    const url = `${CONGRESS_API_BASE}/member/${bioguideId}/sponsored-legislation?api_key=${CONGRESS_API_KEY}&limit=${limit}`;
    const response = await fetchWithTimeout(url, timeout);

    if (!response.ok) {
      throw new Error(`Congress.gov API error: ${response.status} ${response.statusText}`);
    }

    const data: CongressApiResponse = await response.json();
    const bills = (data.sponsoredLegislation || [])
      .filter((item: any) => item.type && item.number) // Filter out amendments
      .map(transformBill);

    console.log(`✅ Fetched ${bills.length} sponsored bills`);
    return bills;
  } catch (error: any) {
    console.error(`❌ Error fetching sponsored bills for ${bioguideId}:`, error.message);
    throw error;
  }
}

/**
 * Fetch co-sponsored legislation for a member
 */
export async function fetchCosponsoredBills(
  bioguideId: string,
  options: { limit?: number; timeout?: number } = {}
): Promise<CongressBill[]> {
  const { limit = DEFAULT_LIMIT, timeout = DEFAULT_TIMEOUT } = options;

  if (!CONGRESS_API_KEY) {
    throw new Error('CONGRESS_API_KEY environment variable is not set');
  }

  console.log(`📋 Fetching up to ${limit} co-sponsored bills for ${bioguideId}...`);

  try {
    const url = `${CONGRESS_API_BASE}/member/${bioguideId}/cosponsored-legislation?api_key=${CONGRESS_API_KEY}&limit=${limit}`;
    const response = await fetchWithTimeout(url, timeout);

    if (!response.ok) {
      // Co-sponsored bills failing is not critical, return empty array
      console.warn(`⚠️ Could not fetch co-sponsored bills: ${response.status}`);
      return [];
    }

    const data: CongressApiResponse = await response.json();
    const bills = (data.cosponsoredLegislation || [])
      .filter((item: any) => item.type && item.number)
      .map(transformBill);

    console.log(`✅ Fetched ${bills.length} co-sponsored bills`);
    return bills;
  } catch (error: any) {
    // Co-sponsored bills are optional, log but don't throw
    console.warn(`⚠️ Error fetching co-sponsored bills for ${bioguideId}:`, error.message);
    return [];
  }
}

/**
 * Fetch both sponsored and co-sponsored bills for a member
 */
export async function fetchMemberBills(
  bioguideId: string,
  options: { limit?: number; timeout?: number } = {}
): Promise<{ sponsoredBills: CongressBill[]; cosponsoredBills: CongressBill[] }> {
  console.log(`📡 Fetching all bills for member ${bioguideId}`);

  try {
    // Fetch both in parallel for better performance
    const [sponsoredBills, cosponsoredBills] = await Promise.all([
      fetchSponsoredBills(bioguideId, options),
      fetchCosponsoredBills(bioguideId, options),
    ]);

    return {
      sponsoredBills,
      cosponsoredBills,
    };
  } catch (error: any) {
    console.error(`❌ Error fetching member bills:`, error.message);
    throw error;
  }
}

/**
 * Calculate statistics from bills
 */
export function calculateBillStats(sponsoredBills: CongressBill[], cosponsoredBills: CongressBill[]) {
  const lawsPassed = sponsoredBills.filter(
    bill => bill.status === 'Became Law'
  ).length;

  const activeBills = sponsoredBills.filter(
    bill => bill.status === 'Introduced' ||
            bill.status === 'Passed House' ||
            bill.status === 'Passed Senate'
  ).length;

  const policyAreas = new Set(
    sponsoredBills
      .map(bill => bill.policy_area)
      .filter(Boolean)
  ).size;

  return {
    totalSponsored: sponsoredBills.length,
    totalCosponsored: cosponsoredBills.length,
    lawsPassed,
    activeBills,
    policyAreas,
  };
}
