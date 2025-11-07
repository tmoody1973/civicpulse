/**
 * Fetch Open Graph image from article URL
 * Falls back to Unsplash if og:image not found
 */

import ogs from 'open-graph-scraper';

export interface OgImageResult {
  imageUrl: string | null;
  imageAlt: string | null;
  source: 'og' | 'none';
}

/**
 * Extract og:image from article URL
 * Returns null if not found or if fetch fails
 */
export async function fetchOgImage(url: string): Promise<OgImageResult> {
  try {
    console.log(`🔍 Fetching og:image from: ${url}`);

    const { result } = await ogs({
      url,
      timeout: 5000, // 5 second timeout
      fetchOptions: {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; HakiVo/1.0; +https://hakivo.com)',
        },
      },
    });

    // Check for og:image (can be array or single object)
    let ogImage: string | undefined;
    if (result.ogImage) {
      if (Array.isArray(result.ogImage)) {
        ogImage = result.ogImage[0]?.url;
      } else {
        ogImage = (result.ogImage as any)?.url;
      }
    }

    if (ogImage) {
      console.log(`   ✅ Found og:image: ${ogImage.substring(0, 60)}...`);

      // Use og:description or og:title as alt text
      const altText = result.ogDescription || result.ogTitle || null;

      return {
        imageUrl: ogImage,
        imageAlt: altText,
        source: 'og',
      };
    }

    console.log(`   ⚠️  No og:image found for ${url}`);
    return {
      imageUrl: null,
      imageAlt: null,
      source: 'none',
    };

  } catch (error: any) {
    console.error(`   ❌ Error fetching og:image from ${url}:`, error.message);
    return {
      imageUrl: null,
      imageAlt: null,
      source: 'none',
    };
  }
}

/**
 * Fetch og:images for multiple articles in parallel
 * Returns map of url -> og:image result
 */
export async function fetchOgImagesForArticles(
  articles: Array<{ url: string; title: string }>
): Promise<Map<string, OgImageResult>> {
  console.log(`📸 Fetching og:images for ${articles.length} articles...`);

  const results = await Promise.allSettled(
    articles.map(async (article) => ({
      url: article.url,
      result: await fetchOgImage(article.url),
    }))
  );

  const imageMap = new Map<string, OgImageResult>();

  results.forEach((promiseResult) => {
    if (promiseResult.status === 'fulfilled') {
      const { url, result } = promiseResult.value;
      imageMap.set(url, result);
    }
  });

  const foundCount = Array.from(imageMap.values()).filter(r => r.imageUrl).length;
  console.log(`   ✅ Found ${foundCount}/${articles.length} og:images`);

  return imageMap;
}
