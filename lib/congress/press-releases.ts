/**
 * Congressional Press Release Fetcher
 *
 * Fetches press releases from various official sources:
 * 1. House.gov official press release RSS feeds
 * 2. Senate.gov official press release RSS feeds
 * 3. Individual representative website RSS feeds
 */

import Parser from 'rss-parser';

export interface PressRelease {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  url: string;
  publishedAt: string;
  source: 'house.gov' | 'senate.gov' | 'representative_site';
}

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'HakiVo/1.0 (Civic Engagement Platform; contact@hakivo.com)'
  }
});

/**
 * Fetch press releases from House.gov for a specific representative
 *
 * House members have RSS feeds at:
 * https://[lastname].house.gov/rss.xml
 * or
 * https://[lastname].house.gov/feed/
 */
export async function fetchHousePressReleases(
  lastName: string,
  limit: number = 10
): Promise<PressRelease[]> {
  const possibleUrls = [
    `https://${lastName.toLowerCase()}.house.gov/rss.xml`,
    `https://${lastName.toLowerCase()}.house.gov/feed/`,
    `https://${lastName.toLowerCase()}.house.gov/press-releases/rss`,
  ];

  for (const url of possibleUrls) {
    try {
      console.log(`🔍 Trying House RSS feed: ${url}`);
      const feed = await parser.parseURL(url);

      if (feed.items && feed.items.length > 0) {
        console.log(`✅ Found ${feed.items.length} press releases from ${url}`);

        return feed.items.slice(0, limit).map((item) => ({
          id: item.guid || item.link || '',
          title: item.title || 'Untitled Press Release',
          excerpt: stripHtml(item.contentSnippet || item.content || '').substring(0, 300) + '...',
          content: item.content,
          url: item.link || '',
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          source: 'house.gov' as const
        }));
      }
    } catch (error) {
      console.warn(`❌ Failed to fetch from ${url}:`, error instanceof Error ? error.message : error);
      continue;
    }
  }

  console.warn(`⚠️  No press releases found for House member: ${lastName}`);
  return [];
}

/**
 * Fetch press releases from Senate.gov for a specific senator
 *
 * Senators have RSS feeds at:
 * https://www.[lastname].senate.gov/rss/feeds/?type=press
 * or
 * https://www.[lastname].senate.gov/public/index.cfm/rss/feed
 */
export async function fetchSenatePressReleases(
  lastName: string,
  limit: number = 10
): Promise<PressRelease[]> {
  const possibleUrls = [
    `https://www.${lastName.toLowerCase()}.senate.gov/rss/feeds/?type=press`,
    `https://www.${lastName.toLowerCase()}.senate.gov/public/index.cfm/rss/feed`,
    `https://www.${lastName.toLowerCase()}.senate.gov/rss.xml`,
  ];

  for (const url of possibleUrls) {
    try {
      console.log(`🔍 Trying Senate RSS feed: ${url}`);
      const feed = await parser.parseURL(url);

      if (feed.items && feed.items.length > 0) {
        console.log(`✅ Found ${feed.items.length} press releases from ${url}`);

        return feed.items.slice(0, limit).map((item) => ({
          id: item.guid || item.link || '',
          title: item.title || 'Untitled Press Release',
          excerpt: stripHtml(item.contentSnippet || item.content || '').substring(0, 300) + '...',
          content: item.content,
          url: item.link || '',
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          source: 'senate.gov' as const
        }));
      }
    } catch (error) {
      console.warn(`❌ Failed to fetch from ${url}:`, error instanceof Error ? error.message : error);
      continue;
    }
  }

  console.warn(`⚠️  No press releases found for Senator: ${lastName}`);
  return [];
}

/**
 * Fetch press releases from a custom website URL (individual rep sites)
 */
export async function fetchCustomPressReleases(
  websiteUrl: string,
  limit: number = 10
): Promise<PressRelease[]> {
  // Common RSS feed paths on representative websites
  const rssPatterns = [
    '/rss.xml',
    '/feed/',
    '/press-releases/rss',
    '/news/rss',
    '/media/rss',
    '/rss/press'
  ];

  const baseUrl = websiteUrl.replace(/\/$/, ''); // Remove trailing slash

  for (const pattern of rssPatterns) {
    const url = `${baseUrl}${pattern}`;

    try {
      console.log(`🔍 Trying custom RSS feed: ${url}`);
      const feed = await parser.parseURL(url);

      if (feed.items && feed.items.length > 0) {
        console.log(`✅ Found ${feed.items.length} press releases from ${url}`);

        return feed.items.slice(0, limit).map((item) => ({
          id: item.guid || item.link || '',
          title: item.title || 'Untitled Press Release',
          excerpt: stripHtml(item.contentSnippet || item.content || '').substring(0, 300) + '...',
          content: item.content,
          url: item.link || '',
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          source: 'representative_site' as const
        }));
      }
    } catch (error) {
      continue; // Try next pattern
    }
  }

  console.warn(`⚠️  No press releases found at: ${websiteUrl}`);
  return [];
}

/**
 * Main function to fetch press releases for any representative
 * Tries multiple sources in order of reliability
 */
export async function fetchRepresentativePressReleases(
  representative: {
    lastName: string;
    chamber: 'House' | 'Senate';
    websiteUrl?: string;
  },
  limit: number = 10
): Promise<PressRelease[]> {
  console.log(`📰 Fetching press releases for ${representative.lastName} (${representative.chamber})`);

  let releases: PressRelease[] = [];

  // Try official House/Senate RSS first
  if (representative.chamber === 'House') {
    releases = await fetchHousePressReleases(representative.lastName, limit);
  } else if (representative.chamber === 'Senate') {
    releases = await fetchSenatePressReleases(representative.lastName, limit);
  }

  // If no results and we have a custom website, try that
  if (releases.length === 0 && representative.websiteUrl) {
    releases = await fetchCustomPressReleases(representative.websiteUrl, limit);
  }

  console.log(`📊 Total press releases found: ${releases.length}`);
  return releases;
}

/**
 * Strip HTML tags from content (for excerpts)
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Known representative RSS feed mappings
 * Add representatives as you discover their RSS feeds
 */
export const KNOWN_RSS_FEEDS: Record<string, string> = {
  // Wisconsin Representatives
  'Moore': 'https://gwenmoore.house.gov/rss.xml',
  'Fitzgerald': 'https://fitzgerald.house.gov/rss.xml',
  'Grothman': 'https://grothman.house.gov/rss.xml',
  'Pocan': 'https://pocan.house.gov/rss.xml',
  'Steil': 'https://steil.house.gov/rss.xml',
  'Tiffany': 'https://tiffany.house.gov/rss.xml',
  'VanOrden': 'https://vanorden.house.gov/rss.xml',

  // Wisconsin Senators
  'Baldwin': 'https://www.baldwin.senate.gov/rss/feeds/?type=press',
  'Johnson': 'https://www.ronjohnson.senate.gov/rss/feeds/?type=press',
};
