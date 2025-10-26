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

// ==================== REPRESENTATIVES / MEMBERS ====================

export interface Representative {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: number;
  chamber: 'House' | 'Senate';
  imageUrl?: string;
  officialUrl?: string;
  terms?: any[];
}

export interface FetchMembersOptions {
  congress?: number;
  state?: string;
  district?: number;
  currentMember?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * State abbreviation to full name mapping
 */
const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

/**
 * Fetch members (representatives and senators) from Congress.gov
 * Note: The Congress.gov API returns House members first (offset 0-249),
 * then senators (offset 250+), so we make TWO calls to get both.
 * State filter doesn't work correctly, so we filter client-side.
 */
export async function fetchMembers(options: FetchMembersOptions = {}): Promise<Representative[]> {
  const {
    state,
    district,
    currentMember = true,
  } = options;

  // Helper function to fetch and parse members
  const fetchBatch = async (offset: number, limit: number): Promise<Representative[]> => {
    const url = new URL(`${API_BASE}/member`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());
    url.searchParams.set('api_key', API_KEY!);

    // Only use currentMember filter (state filter doesn't work properly in API)
    if (currentMember !== undefined) url.searchParams.set('currentMember', currentMember.toString());

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return data.members?.map((member: any) => {
      // Extract chamber from terms.item array (API returns terms as {item: [...]} not [...])
      const termsArray = member.terms?.item || [];
      const latestTerm = termsArray[termsArray.length - 1];
      const chamberRaw = latestTerm?.chamber || 'House of Representatives';
      const chamber = chamberRaw === 'Senate' ? 'Senate' : 'House';

      return {
        bioguideId: member.bioguideId,
        name: member.name || `${member.firstName} ${member.lastName}`,
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        party: member.partyName || 'Unknown',
        state: member.state,
        district: member.district,
        chamber,
        imageUrl: member.depiction?.imageUrl,
        officialUrl: member.officialWebsiteUrl,
        terms: member.terms,
      };
    }) || [];
  };

  try {
    // Fetch BOTH House members (offset 0) AND senators (offset 250)
    // API returns House members first, senators after position 250
    const [houseMembers, senators] = await Promise.all([
      fetchBatch(0, 250),    // House members
      fetchBatch(250, 250),  // Senators
    ]);

    let members = [...houseMembers, ...senators];

    console.log(`📊 Fetched ${members.length} total members (${houseMembers.length} House, ${senators.length} Senate)`);

    // Filter client-side by state (API filter doesn't work)
    if (state) {
      const stateName = STATE_NAMES[state.toUpperCase()] || state;
      console.log(`🔍 Filtering for state: ${state} → ${stateName}`);

      members = members.filter((m: Representative) =>
        m.state === stateName || m.state === state
      );

      const senatorCount = members.filter(m => m.chamber === 'Senate').length;
      const houseCount = members.filter(m => m.chamber === 'House').length;
      console.log(`✅ After state filter: ${members.length} members (${senatorCount} senators, ${houseCount} house)`);
    }

    // Filter client-side by district
    if (district !== undefined) {
      console.log(`🔍 Filtering for district: ${district}`);
      members = members.filter((m: Representative) => m.district === district);
      console.log(`✅ After district filter: ${members.length} members`);
    }

    return members;
  } catch (error) {
    console.error('Error fetching members from Congress.gov:', error);
    throw error;
  }
}

/**
 * Get representatives for a specific state and district
 * Returns 2 senators + 1 house representative
 */
export async function getRepresentativesByLocation(
  state: string,
  district?: number
): Promise<{ senators: Representative[]; representative?: Representative }> {
  // Fetch all current members (need to fetch all to ensure we get senators)
  // Congress.gov API returns newest members first, so we need full set
  const allMembers = await fetchMembers({
    state,
    currentMember: true,
    limit: 250, // Fetch max to get all senators and house members
  });

  const senators = allMembers.filter((m) => m.chamber === 'Senate');

  let representative: Representative | undefined;
  if (district !== undefined) {
    // Find the specific representative for this district
    representative = allMembers.find(
      (m) => m.chamber === 'House' && m.district === district
    );
  }

  return {
    senators,
    representative,
  };
}

/**
 * Fetch detailed member information
 */
export async function fetchMemberDetails(bioguideId: string): Promise<Representative & { biography?: string }> {
  const url = new URL(`${API_BASE}/member/${bioguideId}`);
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
    const member = data.member;

    // Extract chamber from terms.item array
    const termsArray = member.terms?.item || [];
    const latestTerm = termsArray[termsArray.length - 1];
    const chamber = latestTerm?.chamber || 'House of Representatives';

    return {
      bioguideId: member.bioguideId,
      name: member.name || `${member.firstName} ${member.lastName}`,
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      party: member.partyHistory?.[0]?.partyName || 'Unknown',
      state: member.state,
      district: member.district,
      chamber: chamber === 'Senate' ? 'Senate' : 'House',
      imageUrl: member.depiction?.imageUrl,
      officialUrl: member.officialWebsiteUrl,
      terms: member.terms,
      biography: member.bioText,
    };
  } catch (error) {
    console.error(`Error fetching member details for ${bioguideId}:`, error);
    throw error;
  }
}
