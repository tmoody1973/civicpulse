/**
 * Pexels API Client
 *
 * Fetches high-quality images for news articles and topics.
 * Uses Pexels' search API to find relevant images based on keywords.
 *
 * Rate Limits: 200 requests/hour (free tier)
 * Better than Unsplash's 50 requests/hour
 */

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_URL = 'https://api.pexels.com/v1';

export interface PexelsImage {
  id: number;
  url: string; // Large resolution URL
  thumbUrl: string; // Small thumbnail URL
  alt: string;
  photographer: string;
  photographerUrl: string;
  width: number;
  height: number;
  avgColor: string; // Average color hex
}

/**
 * Get a random photo from Pexels for a given keyword
 * Uses search endpoint and picks first result for simplicity
 */
export async function getRandomPhoto(query: string): Promise<PexelsImage | null> {
  if (!PEXELS_API_KEY) {
    throw new Error('PEXELS_API_KEY is not configured');
  }

  console.log(`🎲 Fetching random Pexels photo for: "${query}"`);

  const url = new URL(`${PEXELS_API_URL}/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '1');
  url.searchParams.set('orientation', 'landscape');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      // 404 means no photos found for this query
      if (response.status === 404) {
        console.log(`⚠️  No photos found for query: "${query}"`);
        return null;
      }
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.photos || data.photos.length === 0) {
      console.log(`⚠️  No photos found for query: "${query}"`);
      return null;
    }

    const photo = data.photos[0];
    console.log(`✅ Got random photo by ${photo.photographer}`);

    return {
      id: photo.id,
      url: photo.src.large,
      thumbUrl: photo.src.small,
      alt: photo.alt || query,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      width: photo.width,
      height: photo.height,
      avgColor: photo.avg_color,
    };
  } catch (error) {
    console.error(`Failed to fetch Pexels photo for "${query}":`, error);
    throw error;
  }
}

/**
 * Search for images on Pexels
 */
export async function searchImages(
  query: string,
  perPage: number = 10,
  orientation: 'landscape' | 'portrait' | 'square' = 'landscape'
): Promise<PexelsImage[]> {
  if (!PEXELS_API_KEY) {
    throw new Error('PEXELS_API_KEY is not configured');
  }

  console.log(`🔍 Searching Pexels for: "${query}"`);

  const url = new URL(`${PEXELS_API_URL}/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('orientation', orientation);

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': PEXELS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const photos = data.photos || [];

  console.log(`✅ Found ${photos.length} images from Pexels`);

  return photos.map((photo: any) => ({
    id: photo.id,
    url: photo.src.large,
    thumbUrl: photo.src.small,
    alt: photo.alt || query,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    width: photo.width,
    height: photo.height,
    avgColor: photo.avg_color,
  }));
}
