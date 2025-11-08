/**
 * Brave Search API Alternative for Press Releases
 *
 * Uses Brave Search API to find press releases instead of RSS feeds.
 * Benefits:
 * - Works even without RSS feeds
 * - Finds press releases across different website structures
 * - More reliable for representatives with non-standard websites
 */

export interface PressRelease {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  publishedAt: string;
  source: 'brave_search';
}

interface BraveNewsResult {
  title: string;
  url: string;
  description: string;
  age: string; // e.g., "2 days ago"
  page_age: string; // ISO date
  thumbnail?: {
    src: string;
  };
}

interface BraveNewsResponse {
  results: BraveNewsResult[];
}

/**
 * Fetch press releases using Brave Search API
 *
 * @param representativeName - Full name (e.g., "Gwen Moore")
 * @param chamber - Chamber (House or Senate) to use correct title in search
 * @param officialWebsite - Official website URL to prioritize results (optional)
 * @param limit - Max number of results
 */
export async function fetchPressReleasesViaBraveSearch(
  representativeName: string,
  chamber: 'House' | 'Senate',
  officialWebsite?: string,
  limit: number = 10
): Promise<PressRelease[]> {
  const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;

  if (!BRAVE_API_KEY) {
    console.error('❌ BRAVE_SEARCH_API_KEY not found in environment variables');
    return [];
  }

  try {
    // Query pattern: "[title] "[name]" press releases" with freshness=pm
    // Use "senator" for Senate, "US representative" for House (to avoid state reps)
    // Quotes around name ensure exact phrase matching (prevents confusion with other politicians)
    // Lowercase name for better matching (matches playground behavior)
    const title = chamber === 'Senate' ? 'senator' : 'US representative';
    const searchQuery = `${title} "${representativeName.toLowerCase()}" press releases`;
    console.log(`🔍 Brave News Search query: ${searchQuery}`);

    // Use News Search API with freshness=pm (past month) and safesearch
    // Use URLSearchParams for proper query parameter encoding
    const params = new URLSearchParams({
      q: searchQuery,
      count: '50',
      safesearch: 'moderate',
      freshness: 'pm'
    });

    const response = await fetch(
      `https://api.search.brave.com/res/v1/news/search?${params}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': BRAVE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Brave News API error: ${response.status} ${response.statusText}`);
    }

    const data: BraveNewsResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      console.warn(`⚠️  No results found for: ${searchQuery}`);
      return [];
    }

    console.log(`✅ Found ${data.results.length} news results from Brave`);

    // Show all results (both official .gov and credible news coverage)
    // Already includes variety: official press releases + news articles about them
    // Transform and sort results
    const pressReleases: PressRelease[] = data.results
      .map(result => ({
        id: result.url,
        title: result.title,
        excerpt: result.description || 'No description available',
        url: result.url,
        publishedAt: parsePublishDate(result.age, result.page_age),
        publishedDate: parsePublishDate(result.age, result.page_age), // For sorting
        source: 'brave_search' as const,
      }))
      // Sort by date descending (most recent first)
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, limit)
      .map(({ publishedDate, ...release }) => release); // Remove temporary publishedDate field

    console.log(`📊 Final: ${pressReleases.length} press releases (sorted by date)`);
    return pressReleases;

  } catch (error) {
    console.error('❌ Error fetching press releases via Brave Search:', error);
    return [];
  }
}

/**
 * Extract domain from URL
 * Example: "https://gwenmoore.house.gov/about" → "gwenmoore.house.gov"
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Parse publish date from Brave Search results
 * Brave returns either relative time ("2 days ago") or ISO date
 */
function parsePublishDate(age?: string, pageAge?: string): string {
  // If we have ISO date, use it
  if (pageAge) {
    return new Date(pageAge).toISOString();
  }

  // Parse relative time (e.g., "2 days ago", "1 week ago")
  if (age) {
    const now = new Date();
    const match = age.match(/(\d+)\s+(day|week|month|year)s?\s+ago/i);

    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();

      switch (unit) {
        case 'day':
          now.setDate(now.getDate() - value);
          break;
        case 'week':
          now.setDate(now.getDate() - (value * 7));
          break;
        case 'month':
          now.setMonth(now.getMonth() - value);
          break;
        case 'year':
          now.setFullYear(now.getFullYear() - value);
          break;
      }

      return now.toISOString();
    }
  }

  // Default to current date if we can't parse
  return new Date().toISOString();
}

/**
 * Hybrid approach: Try RSS first, fallback to Brave Search
 *
 * This gives us best of both worlds:
 * - RSS is faster and more structured when available
 * - Brave Search works when RSS isn't available
 */
export async function fetchPressReleasesHybrid(
  representative: {
    name: string;
    lastName: string;
    chamber: 'House' | 'Senate';
    websiteUrl?: string;
  },
  limit: number = 10
): Promise<PressRelease[]> {
  // Try RSS first (import from main press-releases module)
  const { fetchRepresentativePressReleases } = await import('./press-releases');

  console.log(`📰 Trying RSS feeds first for ${representative.name}...`);
  const rssReleases = await fetchRepresentativePressReleases(
    {
      lastName: representative.lastName,
      chamber: representative.chamber,
      websiteUrl: representative.websiteUrl,
    },
    limit
  );

  // If RSS worked, return those results
  if (rssReleases.length > 0) {
    console.log(`✅ RSS feeds worked! Found ${rssReleases.length} releases`);
    return rssReleases.map(r => ({ ...r, source: 'brave_search' as const }));
  }

  // RSS failed, try Brave Search as fallback
  console.log(`⚠️  RSS feeds failed, trying Brave Search...`);
  return fetchPressReleasesViaBraveSearch(
    representative.name,
    representative.chamber,
    representative.websiteUrl,
    limit
  );
}
