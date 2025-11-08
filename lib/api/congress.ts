/**
 * Congress.gov API Client
 *
 * Fetches legislation data from the official Congress.gov API
 * Rate limit: 1 request per second
 * Documentation: https://api.congress.gov/
 */

// Load environment variables (for scripts running outside Next.js)
if (typeof window === 'undefined' && !process.env.CONGRESS_API_KEY) {
  require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
}

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
  sponsorParty?: 'D' | 'R' | 'I' | 'Unknown';
  sponsorState?: string;
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

    // Log first bill to see what Congress.gov actually returns
    if (data.bills && data.bills.length > 0) {
      console.log('[fetchRecentBills] Sample raw bill from Congress.gov:', JSON.stringify(data.bills[0], null, 2));
      console.log('[fetchRecentBills] Sponsor data available:', {
        hasSponsors: !!data.bills[0].sponsors,
        sponsorsArray: data.bills[0].sponsors,
        firstSponsor: data.bills[0].sponsors?.[0]
      });
    }

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
      sponsorParty: bill.sponsors?.[0]?.party || 'Unknown',
      sponsorState: bill.sponsors?.[0]?.state || null,
      url: bill.url,
    })) || [];
  } catch (error) {
    console.error('Error fetching bills from Congress.gov:', error);
    throw error;
  }
}

/**
 * Fetch bill summary from Congress.gov
 * Returns the latest summary text (usually the most comprehensive)
 */
export async function fetchBillSummary(congress: number, billType: string, billNumber: number): Promise<string | null> {
  const url = new URL(`${API_BASE}/bill/${congress}/${billType}/${billNumber}/summaries`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('api_key', API_KEY!);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No summary available
      }
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // Get the latest summary (usually most comprehensive)
    const latestSummary = data.summaries?.[0];
    return latestSummary?.text || null;
  } catch (error) {
    console.warn(`Could not fetch summary for ${billType}${billNumber}:`, error);
    return null;
  }
}

/**
 * Strip HTML tags and decode entities to get plain text
 */
function stripHtmlTags(html: string): string {
  // Remove script and style tags and their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ');
  text = text.trim();

  return text;
}

/**
 * Fetch full bill text from Congress.gov
 * Returns the latest available text version (formatted text as HTML, converted to plain text)
 */
export async function fetchBillText(congress: number, billType: string, billNumber: number): Promise<string | null> {
  const url = new URL(`${API_BASE}/bill/${congress}/${billType}/${billNumber}/text`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('api_key', API_KEY!);

  try {
    // Step 1: Get list of available text versions
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No text available yet
      }
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const textVersions = data.textVersions;

    if (!textVersions || textVersions.length === 0) {
      return null;
    }

    // Step 2: Get the latest version (first in array is usually latest)
    const latestVersion = textVersions[0];

    // Find formatted text format (HTML) - easiest to parse
    const formats = latestVersion.formats;
    const htmlFormat = formats?.find((f: any) => f.type === 'Formatted Text');

    if (!htmlFormat?.url) {
      console.warn(`No HTML format available for ${billType}${billNumber}`);
      return null;
    }

    // Step 3: Fetch the HTML content
    const textResponse = await fetch(htmlFormat.url, {
      headers: {
        'Accept': 'text/html',
      },
    });

    if (!textResponse.ok) {
      throw new Error(`Failed to fetch text content: ${textResponse.status}`);
    }

    const htmlContent = await textResponse.text();

    // Step 4: Strip HTML tags to get plain text
    const plainText = stripHtmlTags(htmlContent);

    return plainText;
  } catch (error) {
    console.warn(`Could not fetch full text for ${billType}${billNumber}:`, error);
    return null;
  }
}

/**
 * Fetch bill by ID (congress-type-number format) and transform to database schema
 * This is the main function to use when fetching bills for the database
 */
export async function fetchBillById(
  congress: number,
  billType: string,
  billNumber: number
): Promise<any> {
  try {
    // Fetch bill details with summary and full text
    const bill = await fetchBillDetails(congress, billType, billNumber, {
      fetchSummary: true,
      fetchFullText: true,
    });

    // Fetch additional metadata
    const [subjects, cosponsors] = await Promise.all([
      fetchBillSubjects(congress, billType, billNumber),
      fetchBillCosponsors(congress, billType, billNumber),
    ]);

    // Transform to database schema format
    return {
      id: `${congress}-${billType}-${billNumber}`,
      congress: bill.congress,
      bill_type: bill.billType,
      bill_number: bill.billNumber,
      title: bill.title,
      summary: bill.summary || null,
      full_text: bill.fullText || null,
      sponsor_name: bill.sponsorName,
      sponsor_party: bill.sponsorParty,
      sponsor_state: bill.sponsorState,
      introduced_date: bill.introducedDate,
      latest_action_date: bill.latestActionDate,
      latest_action_text: bill.latestActionText,
      status: 'introduced', // Default status
      issue_categories: subjects?.legislativeSubjects || [],
      cosponsor_count: cosponsors?.length || 0,
      smartbucket_key: null, // Will be set when bill is analyzed
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching bill ${congress}-${billType}-${billNumber}:`, error);
    throw error;
  }
}

/**
 * Fetch detailed bill information including summary and full text
 */
export async function fetchBillDetails(
  congress: number,
  billType: string,
  billNumber: number,
  options: { fetchSummary?: boolean; fetchFullText?: boolean } = {}
): Promise<Bill & { summary?: string; fullText?: string }> {
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

    const result: Bill & { summary?: string; fullText?: string } = {
      congress: bill.congress,
      billType: bill.type.toLowerCase(),
      billNumber: bill.number,
      title: bill.title || 'No title available',
      introducedDate: bill.introducedDate,
      latestActionDate: bill.latestAction?.actionDate,
      latestActionText: bill.latestAction?.text || 'No action recorded',
      sponsorBioguideId: bill.sponsors?.[0]?.bioguideId || '',
      sponsorName: bill.sponsors?.[0]?.fullName || 'Unknown',
      sponsorParty: bill.sponsors?.[0]?.party || 'Unknown',
      sponsorState: bill.sponsors?.[0]?.state || null,
      url: bill.url,
    };

    // Optionally fetch summary
    if (options.fetchSummary) {
      const summary = await fetchBillSummary(congress, billType, billNumber);
      if (summary) {
        result.summary = summary;
      }
    }

    // Optionally fetch full text
    if (options.fetchFullText) {
      const fullText = await fetchBillText(congress, billType, billNumber);
      if (fullText) {
        result.fullText = fullText;
      }
    }

    return result;
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
      sponsorParty: bill.sponsors?.[0]?.party || 'Unknown',
      sponsorState: bill.sponsors?.[0]?.state || null,
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
  // Enrichment fields from GitHub legislators data
  officeAddress?: string;
  officePhone?: string;
  contactForm?: string;
  websiteUrl?: string;
  rssUrl?: string;
  twitterHandle?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  instagramHandle?: string;
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

/**
 * Fetch cosponsors for a bill
 */
export async function fetchBillCosponsors(
  congress: number,
  billType: string,
  billNumber: number
): Promise<Array<{
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  sponsorshipDate: string;
}> | null> {
  const url = new URL(`${API_BASE}/bill/${congress}/${billType}/${billNumber}/cosponsors`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('api_key', API_KEY!);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Congress API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.cosponsors || data.cosponsors.length === 0) {
      return [];
    }

    return data.cosponsors.map((cosponsor: any) => ({
      bioguideId: cosponsor.bioguideId,
      name: cosponsor.fullName || `${cosponsor.firstName} ${cosponsor.lastName}`,
      party: cosponsor.party || 'Unknown',
      state: cosponsor.state,
      sponsorshipDate: cosponsor.sponsorshipDate
    }));
  } catch (error) {
    console.warn(`Could not fetch cosponsors for ${billType}${billNumber}:`, error);
    return null;
  }
}

/**
 * Fetch actions (legislative history) for a bill
 */
export async function fetchBillActions(
  congress: number,
  billType: string,
  billNumber: number
): Promise<Array<{
  actionDate: string;
  text: string;
  type: string;
  actionCode?: string;
  sourceSystem?: string;
}> | null> {
  const url = new URL(`${API_BASE}/bill/${congress}/${billType}/${billNumber}/actions`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('api_key', API_KEY!);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Congress API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.actions || data.actions.length === 0) {
      return [];
    }

    return data.actions.map((action: any) => ({
      actionDate: action.actionDate,
      text: action.text,
      type: action.type || 'Unknown',
      actionCode: action.actionCode,
      sourceSystem: action.sourceSystem?.name
    }));
  } catch (error) {
    console.warn(`Could not fetch actions for ${billType}${billNumber}:`, error);
    return null;
  }
}

/**
 * Fetch amendments to a bill
 */
export async function fetchBillAmendments(
  congress: number,
  billType: string,
  billNumber: number
): Promise<Array<{
  number: string;
  type: string;
  purpose: string;
  description: string;
  congress: number;
  latestActionDate: string;
  latestActionText: string;
}> | null> {
  const url = new URL(`${API_BASE}/bill/${congress}/${billType}/${billNumber}/amendments`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('api_key', API_KEY!);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Congress API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.amendments || data.amendments.length === 0) {
      return [];
    }

    return data.amendments.map((amendment: any) => ({
      number: amendment.number,
      type: amendment.type,
      purpose: amendment.purpose || '',
      description: amendment.description || '',
      congress: amendment.congress,
      latestActionDate: amendment.latestAction?.actionDate || '',
      latestActionText: amendment.latestAction?.text || ''
    }));
  } catch (error) {
    console.warn(`Could not fetch amendments for ${billType}${billNumber}:`, error);
    return null;
  }
}

/**
 * Fetch subjects (issue categories) for a bill
 * Returns both policy area (broad) and legislative subjects (specific)
 */
export async function fetchBillSubjects(
  congress: number,
  billType: string,
  billNumber: number
): Promise<{
  policyArea: string | null;
  legislativeSubjects: string[];
} | null> {
  const url = new URL(`${API_BASE}/bill/${congress}/${billType}/${billNumber}/subjects`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('api_key', API_KEY!);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Congress API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.subjects) {
      return { policyArea: null, legislativeSubjects: [] };
    }

    const policyArea = data.subjects.policyArea?.name || null;
    const legislativeSubjects = data.subjects.legislativeSubjects?.map((subject: any) => subject.name) || [];

    return {
      policyArea,
      legislativeSubjects,
    };
  } catch (error) {
    console.warn(`Could not fetch subjects for ${billType}${billNumber}:`, error);
    return null;
  }
}
