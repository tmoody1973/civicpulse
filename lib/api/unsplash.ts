/**
 * Unsplash API Client
 *
 * Fetches high-quality images for news articles and stories.
 * Uses Unsplash's search API to find relevant images based on keywords.
 */

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com';

export interface UnsplashImage {
  id: string;
  url: string; // Full resolution URL
  thumbUrl: string; // Thumbnail URL
  description: string | null;
  alt_description: string | null;
  photographer: string;
  photographerUrl: string;
  width: number;
  height: number;
  color: string; // Dominant color
}

export interface SearchImagesParams {
  query: string;
  perPage?: number;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  contentFilter?: 'low' | 'high';
}

/**
 * Search for images on Unsplash
 */
export async function searchImages(
  params: SearchImagesParams
): Promise<UnsplashImage[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error('UNSPLASH_ACCESS_KEY is not configured');
  }

  const {
    query,
    perPage = 10,
    orientation = 'landscape',
    contentFilter = 'high',
  } = params;

  const url = new URL(`${UNSPLASH_API_URL}/search/photos`);
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('orientation', orientation);
  url.searchParams.set('content_filter', contentFilter);

  console.log(`🔍 Searching Unsplash for: "${query}"`);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const results = data.results || [];

  console.log(`✅ Found ${results.length} images from Unsplash`);

  return results.map((result: any) => ({
    id: result.id,
    url: result.urls.regular,
    thumbUrl: result.urls.thumb,
    description: result.description,
    alt_description: result.alt_description,
    photographer: result.user.name,
    photographerUrl: result.user.links.html,
    width: result.width,
    height: result.height,
    color: result.color,
  }));
}

/**
 * Find the best image for a given story/article
 * Uses Unsplash's random photo API to ensure unique images
 * Falls back through multiple query strategies for relevance
 */
export async function findBestImage(
  title: string,
  description: string,
  keywords: string[]
): Promise<UnsplashImage | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error('UNSPLASH_ACCESS_KEY is not configured');
  }

  // Strategy 1: Try specific keywords (most relevant)
  for (const keyword of keywords) {
    try {
      const image = await getRandomPhoto(keyword);
      if (image) return image;
    } catch (error) {
      console.warn(`Failed to get random photo for keyword "${keyword}":`, error);
    }
  }

  // Strategy 2: Try first 3 words of title
  const titleWords = title.split(' ').slice(0, 3).join(' ');
  try {
    const image = await getRandomPhoto(titleWords);
    if (image) return image;
  } catch (error) {
    console.warn(`Failed to get random photo for title "${titleWords}":`, error);
  }

  // Strategy 3: Try description (first 50 chars)
  const descQuery = description.substring(0, 50).trim();
  if (descQuery) {
    try {
      const image = await getRandomPhoto(descQuery);
      if (image) return image;
    } catch (error) {
      console.warn(`Failed to get random photo for description:`, error);
    }
  }

  // No images found
  return null;
}

/**
 * Get a random photo from Unsplash
 * Uses the random endpoint to ensure unique images each time
 */
async function getRandomPhoto(query: string): Promise<UnsplashImage | null> {
  const url = new URL(`${UNSPLASH_API_URL}/photos/random`);
  url.searchParams.set('query', query);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('content_filter', 'high');

  console.log(`🎲 Fetching random Unsplash photo for: "${query}"`);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
    },
  });

  if (!response.ok) {
    // 404 means no photos found for this query
    if (response.status === 404) {
      console.log(`⚠️  No photos found for query: "${query}"`);
      return null;
    }
    throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  console.log(`✅ Got random photo by ${result.user.name}`);

  return {
    id: result.id,
    url: result.urls.regular,
    thumbUrl: result.urls.thumb,
    description: result.description,
    alt_description: result.alt_description,
    photographer: result.user.name,
    photographerUrl: result.user.links.html,
    width: result.width,
    height: result.height,
    color: result.color,
  };
}

/**
 * Download attribution info for an image
 * Required by Unsplash API terms
 */
export async function downloadImage(imageId: string): Promise<void> {
  if (!UNSPLASH_ACCESS_KEY) {
    return;
  }

  const url = `${UNSPLASH_API_URL}/photos/${imageId}/download`;

  await fetch(url, {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
    },
  });
}
