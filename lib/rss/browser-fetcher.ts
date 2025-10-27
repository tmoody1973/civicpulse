/**
 * Browser-based RSS Fetcher
 *
 * Uses headless browser to bypass bot protection on RSS feeds
 * Falls back to direct fetch if browser is not available
 */

import Parser from 'rss-parser';
import type { RSSArticle } from './parser';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media'],
      ['dc:creator', 'author'],
      ['content:encoded', 'content'],
    ],
  },
});

/**
 * Fetch RSS feed using headless browser (bypasses bot protection)
 * This can be called from an API route that uses Playwright
 */
export async function fetchRSSWithBrowser(
  feedUrl: string,
  sourceName: string
): Promise<RSSArticle[]> {
  try {
    // Option 1: Try direct fetch first (works for Politico, etc.)
    try {
      const feed = await parser.parseURL(feedUrl);
      return mapFeedToArticles(feed, sourceName);
    } catch (directError) {
      console.log(`Direct fetch failed for ${feedUrl}, will need browser method`);
    }

    // Option 2: If direct fetch fails, instruct to use browser
    // This would be called from an API route that has access to Playwright
    throw new Error(
      `RSS feed ${feedUrl} requires browser fetching. ` +
      `Use the /api/rss/fetch-with-browser endpoint instead.`
    );

  } catch (error) {
    console.error(`Error fetching RSS feed ${feedUrl}:`, error);
    throw error;
  }
}

/**
 * Parse RSS XML content (can be used with browser-fetched HTML)
 */
export async function parseRSSContent(
  xmlContent: string,
  sourceName: string
): Promise<RSSArticle[]> {
  try {
    const feed = await parser.parseString(xmlContent);
    return mapFeedToArticles(feed, sourceName);
  } catch (error) {
    console.error(`Error parsing RSS content for ${sourceName}:`, error);
    throw error;
  }
}

/**
 * Map RSS feed to articles array
 */
function mapFeedToArticles(feed: any, sourceName: string): RSSArticle[] {
  return feed.items.map((item: any) => ({
    title: item.title || 'Untitled',
    link: item.link || '',
    description: item.contentSnippet || item.description || '',
    pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
    author: item.author || item.creator || undefined,
    source: sourceName,
    imageUrl: extractImageUrl(item),
  }));
}

/**
 * Extract image URL from various RSS formats
 */
function extractImageUrl(item: any): string | undefined {
  // Try media:content (Yahoo Media RSS)
  if (item.media && typeof item.media === 'object') {
    if (item.media.$ && item.media.$.url) {
      return item.media.$.url;
    }
    if (item.media.content && item.media.content.$ && item.media.content.$.url) {
      return item.media.content.$.url;
    }
  }

  // Try enclosure (standard RSS)
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }

  // Try itunes:image
  if (item.itunes && item.itunes.image) {
    return item.itunes.image;
  }

  return undefined;
}

/**
 * Configuration for browser-based RSS fetching
 */
export const BROWSER_FETCH_CONFIG = {
  // Feeds that require browser fetching (blocked by bot protection)
  requiresBrowser: [
    'https://thehill.com/',
    'https://www.c-span.org/',
  ],

  // Browser configuration
  browser: {
    headless: true,
    timeout: 30000, // 30 seconds
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
};

/**
 * Check if a URL requires browser fetching
 */
export function requiresBrowserFetch(url: string): boolean {
  return BROWSER_FETCH_CONFIG.requiresBrowser.some(blocked => url.includes(blocked));
}
