/**
 * Pexels API Client
 *
 * Fetches high-quality stock photos for brief featured images
 * Free tier: 200 requests/hour
 */

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
  };
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
  page: number;
  per_page: number;
  total_results: number;
}

/**
 * Search Pexels for a relevant image
 *
 * @param query - Search query (e.g., "education policy", "defense legislation")
 * @param orientation - Photo orientation (default: landscape)
 * @returns Image URL or null if not found
 */
export async function searchPexelsImage(
  query: string,
  orientation: 'landscape' | 'portrait' | 'square' = 'landscape'
): Promise<string | null> {
  if (!PEXELS_API_KEY) {
    console.warn('⚠️  PEXELS_API_KEY not set, skipping Pexels image search');
    return null;
  }

  try {
    console.log(`🔍 Searching Pexels for: "${query}"`);

    const url = new URL('https://api.pexels.com/v1/search');
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', '1');
    url.searchParams.set('orientation', orientation);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      console.error(`❌ Pexels API error: ${response.status}`);
      return null;
    }

    const data: PexelsSearchResponse = await response.json();

    if (data.photos && data.photos.length > 0) {
      const photo = data.photos[0];
      console.log(`✅ Found Pexels image: ${photo.src.large} (by ${photo.photographer})`);
      return photo.src.large; // High quality, web-optimized
    }

    console.log('⚠️  No Pexels images found for query:', query);
    return null;
  } catch (error: any) {
    console.error('❌ Pexels search failed:', error.message);
    return null;
  }
}

/**
 * Get a topic-relevant search query for Pexels based on category
 *
 * Maps brief categories to effective Pexels search terms
 */
export function getCategorySearchQuery(category: string): string {
  const categoryMap: Record<string, string> = {
    'Education': 'education classroom students',
    'Science & Technology': 'technology innovation digital',
    'Technology': 'technology computer innovation',
    'Business & Economy': 'business professional office',
    'Tax Policy': 'finance calculator tax',
    'Infrastructure': 'infrastructure construction highway',
    'Defense & Security': 'military capitol building flag',
    'Civil Rights': 'justice equality diversity',
    'Healthcare': 'healthcare medical hospital',
    'Finance': 'finance banking money',
    'Economy': 'economy market business',
    'Legislative News': 'capitol building government',
  };

  return categoryMap[category] || 'united states capitol building';
}
