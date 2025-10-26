/**
 * Congress.gov API Client
 *
 * Fetches legislation data from the official Congress.gov API
 * Rate limit: 1 request per second
 * Documentation: https://api.congress.gov/
 */

const API_BASE = 'https://api.congress.gov/v3';
const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.warn('CONGRESS_API_KEY not set - Congress.gov API will not work');
}

export interface Bill {
  congress: number;
  billType: string; //  'hr' | 's' | 'hjres' | 'sjres' | 'hconres' | 'sconres' | 'hres' | 'sres'
  billNumber: number;
  title: string;
  summary?: string;
  introducedDate: string;
  latestActionDate: string;
  latestActionText: string;
  sponsorBioguideId: string;
  sponsorName: string;
  url: string;
}

export interface FetchBillsOptions {
  congress?: number; // Default: current congress (118)
  limit?: number; // Default: 20, max: 250
  offset?: number; // For pagination
  sort?: 'updateDate+desc' | 'updateDate+asc';
}

/**
 * Fetch recent bills from Congress.gov
 */
export async function fetchRecentBills(options: FetchBillsOptions = {}): Promise<Bill[]> {
  const {
    congress = 118,
    limit = 20,
    offset = 0,
    sort = 'updateDate+desc'
  } = options;

  const url = new URL(`${API_BASE}/bill/${congress}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', Math.min(limit, 250).toString());
  url.searchParams.set('offset', offset.toString());
  url.searchParams.set('sort', sort);
  url.searchParams.set('api_key', API_KEY!);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform API response to our Bill interface
    return data.bills?.map((bill: any) => ({
      congress: bill.congress,
      billType: bill.type.toLowerCase(),
      billNumber: bill.number,
      title: bill.title || 'No title available',
      introducedDate: bill.introducedDate,
      latestActionDate: bill.latestAction?.actionDate,
      latestActionText: bill.latestAction?.text || 'No action recorded',
      sponsorBioguideId: bill.sponsors?.[0]?.bioguideId || '',
      sponsorName: bill.sponsors?.[0]?.fullName || 'Unknown',
      url: bill.url,
    })) || [];
  } catch (error) {
    console.error('Error fetching bills from Congress.gov:', error);
    throw error;
  }
}

/**
 * Fetch detailed bill information including full text summary
 */
export async function fetchBillDetails(congress: number, billType: string, billNumber: number): Promise<Bill & { fullText?: string }> {
  const url = new URL(`${API_BASE}/bill/${congress}/${billType}/${billNumber}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('api_key', API_KEY!);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const bill = data.bill;

    // Fetch summary text separately
    const summaryUrl = new URL(`${API_BASE}/bill/${congress}/${billType}/${billNumber}/summaries`);
    summaryUrl.searchParams.set('format', 'json');
    summaryUrl.searchParams.set('api_key', API_KEY!);

    let summary = '';
    try {
      const summaryResponse = await fetch(summaryUrl.toString());
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        summary = summaryData.summaries?.[0]?.text || '';
      }
    } catch (err) {
      console.warn(`Could not fetch summary for bill ${billType}${billNumber}:`, err);
    }

    return {
      congress: bill.congress,
      billType: bill.type.toLowerCase(),
      billNumber: bill.number,
      title: bill.title || 'No title available',
      summary,
      introducedDate: bill.introducedDate,
      latestActionDate: bill.latestAction?.actionDate,
      latestActionText: bill.latestAction?.text || 'No action recorded',
      sponsorBioguideId: bill.sponsors?.[0]?.bioguideId || '',
      sponsorName: bill.sponsors?.[0]?.fullName || 'Unknown',
      url: bill.url,
      fullText: summary,
    };
  } catch (error) {
    console.error(`Error fetching bill details for ${billType}${billNumber}:`, error);
    throw error;
  }
}

/**
 * Search bills by keyword
 */
export async function searchBills(query: string, options: FetchBillsOptions = {}): Promise<Bill[]> {
  const {
    congress = 118,
    limit = 20,
    offset = 0,
  } = options;

  const url = new URL(`${API_BASE}/bill/${congress}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('query', query);
  url.searchParams.set('limit', Math.min(limit, 250).toString());
  url.searchParams.set('offset', offset.toString());
  url.searchParams.set('api_key', API_KEY!);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Congress API search error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return data.bills?.map((bill: any) => ({
      congress: bill.congress,
      billType: bill.type.toLowerCase(),
      billNumber: bill.number,
      title: bill.title || 'No title available',
      introducedDate: bill.introducedDate,
      latestActionDate: bill.latestAction?.actionDate,
      latestActionText: bill.latestAction?.text || 'No action recorded',
      sponsorBioguideId: bill.sponsors?.[0]?.bioguideId || '',
      sponsorName: bill.sponsors?.[0]?.fullName || 'Unknown',
      url: bill.url,
    })) || [];
  } catch (error) {
    console.error('Error searching bills:', error);
    throw error;
  }
}
