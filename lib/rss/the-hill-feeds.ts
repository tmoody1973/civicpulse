// The Hill RSS Feed Configuration
// Maps our issue categories to The Hill's RSS feeds

export interface RSSFeed {
  id: string;
  name: string;
  url: string;
  category: 'news' | 'policy';
}

// The Hill RSS Feeds
export const THE_HILL_FEEDS: RSSFeed[] = [
  // NEWS Feeds (General Congressional Activity)
  {
    id: 'senate',
    name: 'Senate',
    url: 'https://thehill.com/rss/feed/senate',
    category: 'news',
  },
  {
    id: 'house',
    name: 'House',
    url: 'https://thehill.com/rss/feed/house-of-representatives',
    category: 'news',
  },
  {
    id: 'administration',
    name: 'Administration',
    url: 'https://thehill.com/rss/feed/administration',
    category: 'news',
  },
  {
    id: 'campaign',
    name: 'Campaign',
    url: 'https://thehill.com/rss/feed/campaign',
    category: 'news',
  },

  // POLICY Feeds (Topic-Specific)
  {
    id: 'healthcare',
    name: 'Healthcare',
    url: 'https://thehill.com/rss/feed/healthcare',
    category: 'policy',
  },
  {
    id: 'defense',
    name: 'Defense',
    url: 'https://thehill.com/rss/feed/defense',
    category: 'policy',
  },
  {
    id: 'energy-environment',
    name: 'Energy & Environment',
    url: 'https://thehill.com/rss/feed/energy-environment',
    category: 'policy',
  },
  {
    id: 'finance',
    name: 'Finance',
    url:'https://thehill.com/rss/feed/finance',
    category: 'policy',
  },
  {
    id: 'technology',
    name: 'Technology',
    url: 'https://thehill.com/rss/feed/technology',
    category: 'policy',
  },
  {
    id: 'transportation',
    name: 'Transportation',
    url: 'https://thehill.com/rss/feed/transportation',
    category: 'policy',
  },
  {
    id: 'international',
    name: 'International',
    url: 'https://thehill.com/rss/feed/international',
    category: 'policy',
  },
];

// Map user interest categories to The Hill feeds
export const INTEREST_TO_FEED_MAP: Record<string, string[]> = {
  // Direct matches
  'healthcare': ['healthcare'],
  'defense': ['defense'],
  'technology': ['technology'],
  'transportation': ['transportation'],

  // Mapped matches
  'education': ['senate', 'house'], // No specific feed, use general
  'science': ['technology'], // Closest match
  'climate': ['energy-environment'],
  'economy': ['finance'],
  'business': ['finance'],
  'taxes': ['finance'],
  'immigration': ['international'],
  'housing': ['senate', 'house'], // No specific feed
  'agriculture': ['senate', 'house'], // No specific feed
  'social': ['senate', 'house'], // No specific feed
  'civil-rights': ['senate', 'house'], // No specific feed
};

// Get feeds for user's selected interests
export function getFeedsForInterests(interests: string[]): RSSFeed[] {
  const feedIds = new Set<string>();

  // Always include Senate and House
  feedIds.add('senate');
  feedIds.add('house');

  // Add feeds based on interests
  interests.forEach(interest => {
    const mappedFeeds = INTEREST_TO_FEED_MAP[interest] || [];
    mappedFeeds.forEach(feedId => feedIds.add(feedId));
  });

  // Return unique feeds
  return THE_HILL_FEEDS.filter(feed => feedIds.has(feed.id));
}

// Get all available policy feeds
export function getPolicyFeeds(): RSSFeed[] {
  return THE_HILL_FEEDS.filter(feed => feed.category === 'policy');
}

// Get all available news feeds
export function getNewsFeeds(): RSSFeed[] {
  return THE_HILL_FEEDS.filter(feed => feed.category === 'news');
}
