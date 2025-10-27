/**
 * Geocodio API Client
 *
 * Provides congressional district and representative lookup
 * using zip code or full address.
 *
 * FREE TIER: 2,500 lookups/day
 * RESPONSE TIME: ~200ms (vs Congress.gov ~800ms)
 *
 * @see https://www.geocod.io/docs/
 */

const GEOCODIO_API_KEY = process.env.GEOCODIO_API_KEY!;
const BASE_URL = 'https://api.geocod.io/v1.7';

// === Type Definitions ===

export interface CongressionalDistrictData {
  name: string; // e.g., "Congressional District 8"
  district_number: number; // 8 (or 0 for at-large, 98 for non-voting)
  ocd_id: string; // "ocd-division/country:us/state:va/cd:8"
  congress_number: string; // "119th"
  congress_years: string; // "2025-2027"
  proportion: number; // For zip codes that span multiple districts
  current_legislators: Legislator[];
}

export interface Legislator {
  type: 'representative' | 'senator';
  seniority: 'senior' | 'junior' | null;
  bio: {
    last_name: string;
    first_name: string;
    birthday: string; // ISO date
    gender: 'M' | 'F';
    party: string; // "Democrat", "Republican", "Independent"
    photo_url: string;
    photo_attribution: string;
  };
  contact: {
    url: string;
    address: string; // Full office address
    phone: string;
    contact_form: string | null;
  };
  social: {
    rss_url: string | null;
    twitter: string | null;
    facebook: string | null;
    youtube: string | null;
    youtube_id: string | null;
  };
  references: {
    bioguide_id: string; // ⭐ SAME AS CONGRESS.GOV
    thomas_id: string;
    opensecrets_id: string;
    lis_id: string | null;
    cspan_id: string;
    govtrack_id: string;
    votesmart_id: string;
    ballotpedia_id: string;
    washington_post_id: string | null;
    icpsr_id: string;
    wikipedia_id: string;
  };
  source: string;
}

export interface GeocodioResponse {
  input: {
    postal_code?: string;
    address_components?: any;
  };
  results: Array<{
    address_components: any;
    formatted_address: string;
    location: {
      lat: number;
      lng: number;
    };
    accuracy: number;
    accuracy_type: string;
    source: string;
    fields: {
      congressional_districts: CongressionalDistrictData[];
    };
  }>;
}

// === API Functions ===

/**
 * Look up representatives by ZIP code
 *
 * Returns congressional district + all legislators (1 rep + 2 senators)
 *
 * @param zipCode - 5-digit US ZIP code
 * @returns Array of congressional districts (may be multiple if ZIP spans districts)
 * @throws Error if zip code is invalid or API fails
 */
export async function getRepresentativesByZip(
  zipCode: string
): Promise<CongressionalDistrictData[]> {
  // Validate ZIP code
  if (!/^\d{5}$/.test(zipCode)) {
    throw new Error('Invalid ZIP code format. Must be 5 digits.');
  }

  const url = `${BASE_URL}/geocode?postal_code=${zipCode}&fields=cd119&api_key=${GEOCODIO_API_KEY}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 604800 } // Cache for 7 days
    } as any);

    if (!response.ok) {
      throw new Error(
        `Geocodio API error: ${response.status} ${response.statusText}`
      );
    }

    const data: GeocodioResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No results found for ZIP code');
    }

    const bestResult = data.results[0];

    if (!bestResult?.fields?.congressional_districts) {
      throw new Error('No congressional district found for ZIP code');
    }

    // Sort by proportion (highest first) for multi-district ZIPs
    return bestResult.fields.congressional_districts.sort(
      (a, b) => b.proportion - a.proportion
    );
  } catch (error) {
    console.error('Geocodio lookup error:', error);
    throw error;
  }
}

/**
 * Look up representatives by full address
 *
 * More accurate than ZIP code for addresses that span multiple districts
 *
 * @param address - Full street address (e.g., "1109 N Highland St, Arlington VA")
 * @returns Array of congressional districts (usually 1)
 */
export async function getRepresentativesByAddress(
  address: string
): Promise<CongressionalDistrictData[]> {
  const url = `${BASE_URL}/geocode?q=${encodeURIComponent(
    address
  )}&fields=cd119&api_key=${GEOCODIO_API_KEY}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 604800 }
    } as any);

    if (!response.ok) {
      throw new Error(
        `Geocodio API error: ${response.status} ${response.statusText}`
      );
    }

    const data: GeocodioResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No results found for address');
    }

    const bestResult = data.results[0];

    if (!bestResult?.fields?.congressional_districts) {
      throw new Error('No congressional district found for address');
    }

    return bestResult.fields.congressional_districts;
  } catch (error) {
    console.error('Geocodio lookup error:', error);
    throw error;
  }
}

// === Helper Functions ===

/**
 * Extract state abbreviation from office address
 *
 * @example "1226 Longworth House Office Building Washington DC 20515-4608" → "DC"
 */
export function extractStateFromAddress(address: string): string {
  const stateMatch = address.match(/\b([A-Z]{2})\b/);
  return stateMatch ? stateMatch[1] : 'Unknown';
}

/**
 * Extract district number from congressional district name
 *
 * @example "Congressional District 8" → 8
 */
export function extractDistrictNumber(districtName: string): number | null {
  const match = districtName.match(/District (\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Convert district data to state abbreviation
 *
 * @example "ocd-division/country:us/state:va/cd:8" → "VA"
 */
export function extractStateFromOcdId(ocdId: string): string {
  const match = ocdId.match(/state:([a-z]{2})/);
  return match ? match[1].toUpperCase() : 'Unknown';
}
