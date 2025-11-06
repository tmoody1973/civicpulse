/**
 * Nitter RSS Client - Free Twitter/X Feed Fetcher
 *
 * Nitter provides RSS feeds for any Twitter account without API keys
 * Perfect for displaying recent tweets from representatives
 *
 * Nitter Instances (fallback list):
 * - https://nitter.net
 * - https://nitter.1d4.us
 * - https://nitter.kavin.rocks
 * - https://nitter.nixnet.services
 */

import { XMLParser } from 'fast-xml-parser';

export interface Tweet {
  id: string;
  text: string;
  author: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  publishedAt: string;
  url: string;
  media?: {
    type: 'photo' | 'video';
    url: string;
    thumbnailUrl?: string;
  }[];
  stats?: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
}

interface NitterInstance {
  url: string;
  active: boolean;
}

// Fallback Nitter instances (use multiple for reliability)
const NITTER_INSTANCES: NitterInstance[] = [
  { url: 'https://nitter.net', active: true },
  { url: 'https://nitter.1d4.us', active: true },
  { url: 'https://nitter.kavin.rocks', active: true },
  { url: 'https://nitter.nixnet.services', active: true }
];

/**
 * Fetch tweets from a Twitter username using Nitter RSS
 *
 * @param username - Twitter handle (without @)
 * @param limit - Number of tweets to fetch (default: 10)
 * @returns Array of tweets
 */
export async function fetchTweets(
  username: string,
  limit: number = 10
): Promise<Tweet[]> {
  // Try each Nitter instance until one works
  for (const instance of NITTER_INSTANCES) {
    if (!instance.active) continue;

    try {
      const tweets = await fetchTweetsFromInstance(instance.url, username, limit);

      if (tweets.length > 0) {
        console.log(`✅ Fetched ${tweets.length} tweets for @${username} from ${instance.url}`);
        return tweets;
      }
    } catch (error) {
      console.warn(`⚠️  Nitter instance ${instance.url} failed:`, error instanceof Error ? error.message : 'Unknown error');
      // Continue to next instance
    }
  }

  console.error(`❌ All Nitter instances failed for @${username}`);
  return [];
}

/**
 * Fetch tweets from a specific Nitter instance
 */
async function fetchTweetsFromInstance(
  instanceUrl: string,
  username: string,
  limit: number
): Promise<Tweet[]> {
  const rssUrl = `${instanceUrl}/${username}/rss`;

  const response = await fetch(rssUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; HakiVo/1.0; +https://hakivo.com)'
    },
    // 10 second timeout
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const xml = await response.text();

  // Parse RSS XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  const parsed = parser.parse(xml);

  if (!parsed.rss?.channel?.item) {
    throw new Error('Invalid RSS format');
  }

  const items = Array.isArray(parsed.rss.channel.item)
    ? parsed.rss.channel.item
    : [parsed.rss.channel.item];

  // Convert RSS items to Tweet format
  const tweets: Tweet[] = items.slice(0, limit).map((item: any, index: number) => {
    // Extract text (remove RT prefix if retweet)
    let text = item.description || item.title || '';
    text = text.replace(/<[^>]*>/g, ''); // Strip HTML tags
    text = text.trim();

    // Extract media if present
    const media: Tweet['media'] = [];
    if (item['media:thumbnail'] || item['media:content']) {
      const mediaContent = item['media:content'] || item['media:thumbnail'];
      const mediaUrl = mediaContent['@_url'];

      if (mediaUrl) {
        media.push({
          type: mediaUrl.includes('video') ? 'video' : 'photo',
          url: mediaUrl,
          thumbnailUrl: mediaUrl
        });
      }
    }

    // Extract tweet ID from link
    const link = item.link || item.guid;
    const tweetId = link ? link.split('/').pop()?.split('#')[0] : `tweet-${index}`;

    return {
      id: tweetId || `tweet-${index}`,
      text,
      author: {
        username,
        displayName: parsed.rss.channel.title?.replace(' / Twitter', '').replace(' (@' + username + ')', '') || username,
        avatarUrl: parsed.rss.channel.image?.url
      },
      publishedAt: item.pubDate || new Date().toISOString(),
      url: link || `https://twitter.com/${username}/status/${tweetId}`,
      media: media.length > 0 ? media : undefined
    };
  });

  return tweets;
}

/**
 * Fetch tweets for multiple users in parallel
 *
 * @param usernames - Array of Twitter handles
 * @param tweetsPerUser - Number of tweets per user (default: 5)
 * @returns Map of username to tweets
 */
export async function fetchTweetsForMultipleUsers(
  usernames: string[],
  tweetsPerUser: number = 5
): Promise<Map<string, Tweet[]>> {
  const results = new Map<string, Tweet[]>();

  // Fetch in parallel
  const promises = usernames.map(async (username) => {
    try {
      const tweets = await fetchTweets(username, tweetsPerUser);
      return { username, tweets };
    } catch (error) {
      console.error(`Failed to fetch tweets for @${username}:`, error);
      return { username, tweets: [] };
    }
  });

  const settled = await Promise.allSettled(promises);

  settled.forEach((result) => {
    if (result.status === 'fulfilled') {
      results.set(result.value.username, result.value.tweets);
    }
  });

  return results;
}

/**
 * Health check - verify at least one Nitter instance is working
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  workingInstances: string[];
  failedInstances: string[];
}> {
  const workingInstances: string[] = [];
  const failedInstances: string[] = [];

  await Promise.all(
    NITTER_INSTANCES.map(async (instance) => {
      try {
        // Test with a known working account (e.g., @NASA)
        const tweets = await fetchTweetsFromInstance(instance.url, 'NASA', 1);

        if (tweets.length > 0) {
          workingInstances.push(instance.url);
        } else {
          failedInstances.push(instance.url);
        }
      } catch (error) {
        failedInstances.push(instance.url);
      }
    })
  );

  return {
    healthy: workingInstances.length > 0,
    workingInstances,
    failedInstances
  };
}
