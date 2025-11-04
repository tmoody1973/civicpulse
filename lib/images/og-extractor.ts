/**
 * Open Graph Image Extractor
 *
 * Extracts featured images from news article URLs using Open Graph meta tags.
 * Most news sites (The Hill, Politico, etc.) include high-quality og:image tags.
 */

export interface OGImageData {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

/**
 * Extract Open Graph image from a URL
 * Uses fetch + regex to extract og:image meta tag
 */
export async function extractOGImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HakiVo/1.0; +https://hakivo.com)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extract og:image meta tag
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImageMatch && ogImageMatch[1]) {
      return ogImageMatch[1];
    }

    // Fallback: Try twitter:image
    const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    if (twitterImageMatch && twitterImageMatch[1]) {
      return twitterImageMatch[1];
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Timeout fetching OG image from ${url}`);
    } else {
      console.error(`Error extracting OG image from ${url}:`, error);
    }
    return null;
  }
}

/**
 * Extract comprehensive OG image data (URL, dimensions, alt text)
 */
export async function extractOGImageData(url: string): Promise<OGImageData | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HakiVo/1.0; +https://hakivo.com)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract all OG image-related meta tags
    const ogImageUrl = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogImageWidth = html.match(/<meta\s+property=["']og:image:width["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogImageHeight = html.match(/<meta\s+property=["']og:image:height["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogImageAlt = html.match(/<meta\s+property=["']og:image:alt["']\s+content=["']([^"']+)["']/i)?.[1];

    if (!ogImageUrl) {
      // Fallback to twitter:image
      const twitterImageUrl = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)?.[1];
      if (twitterImageUrl) {
        return { url: twitterImageUrl };
      }
      return null;
    }

    return {
      url: ogImageUrl,
      width: ogImageWidth ? parseInt(ogImageWidth, 10) : undefined,
      height: ogImageHeight ? parseInt(ogImageHeight, 10) : undefined,
      alt: ogImageAlt,
    };
  } catch (error) {
    console.error(`Error extracting OG image data from ${url}:`, error);
    return null;
  }
}

/**
 * Batch extract OG images from multiple URLs
 * Processes in parallel with Promise.allSettled to avoid one failure blocking others
 */
export async function extractOGImagesBatch(urls: string[]): Promise<Map<string, string>> {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const imageUrl = await extractOGImage(url);
      return { url, imageUrl };
    })
  );

  const imageMap = new Map<string, string>();

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.imageUrl) {
      imageMap.set(result.value.url, result.value.imageUrl);
    }
  }

  return imageMap;
}
