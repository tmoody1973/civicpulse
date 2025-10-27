/**
 * RSS Feed Parser
 *
 * Fetches and parses RSS feeds from Congressional news sources
 * Uses rss-parser for XML parsing
 */

import Parser from 'rss-parser';

export interface RSSArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author?: string;
  source: string;
  imageUrl?: string;
}

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
 * Fetch and parse a single RSS feed
 */
export async function fetchRSSFeed(feedUrl: string, sourceName: string): Promise<RSSArticle[]> {
  try {
    const feed = await parser.parseURL(feedUrl);

    return feed.items.map((item) => ({
      title: item.title || 'Untitled',
      link: item.link || '',
      description: item.contentSnippet || (item as any).description || '',
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      author: (item as any).author || (item as any).creator || undefined,
      source: sourceName,
      imageUrl: extractImageUrl(item),
    }));
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedUrl}:`, error);
    throw new Error(`Failed to fetch RSS feed from ${sourceName}`);
  }
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
 * Fetch multiple RSS feeds in parallel
 */
export async function fetchMultipleFeeds(
  feeds: Array<{ url: string; name: string }>
): Promise<RSSArticle[]> {
  const results = await Promise.allSettled(
    feeds.map(feed => fetchRSSFeed(feed.url, feed.name))
  );

  const articles: RSSArticle[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    } else {
      console.warn(`Failed to fetch feed ${feeds[index].name}:`, result.reason);
    }
  });

  // Sort by publication date (newest first)
  return articles.sort((a, b) => {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });
}
