import { inngest } from '../client';
import ogs from 'open-graph-scraper';

interface NewsArticle {
  title: string;
  url: string;
  publishedDate: string;
  summary: string;
  source: string;
  imageUrl?: string;
  relevantTopics: string[];
}

// Perplexity API Response Types (for type safety)
interface PerplexityImage {
  image_url: string;
  height: number;
  width: number;
  origin_url: string;
  title: string;
}

interface PerplexitySearchResult {
  title: string;
  url: string;
  date?: string;
  snippet: string;
}

interface PerplexityAPIResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  images?: Array<PerplexityImage | string>; // Can be object or string
  search_results?: PerplexitySearchResult[];
}

/**
 * Type guard to check if value is a PerplexityImage object
 */
function isPerplexityImage(value: unknown): value is PerplexityImage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'image_url' in value &&
    typeof (value as PerplexityImage).image_url === 'string'
  );
}

/**
 * Type guard to validate PerplexitySearchResult
 */
function isValidSearchResult(value: unknown): value is PerplexitySearchResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'title' in value &&
    'url' in value &&
    typeof (value as PerplexitySearchResult).title === 'string' &&
    typeof (value as PerplexitySearchResult).url === 'string'
  );
}

/**
 * Fetch OG image from article URL using open-graph-scraper
 * Much more reliable than regex parsing - handles relative URLs, retries, multiple fallbacks
 */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const { result } = await ogs({
      url,
      timeout: 5000, // 5 second timeout
      fetchOptions: {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; CivicPulseBot/1.0)'
        }
      }
    } as any); // Type assertion: retry option exists but not in types

    // Try og:image first (most common)
    if (result.ogImage) {
      const image = Array.isArray(result.ogImage)
        ? result.ogImage[0]
        : result.ogImage;
      return image.url;
    }

    // Fallback to Twitter image
    if (result.twitterImage) {
      const image = Array.isArray(result.twitterImage)
        ? result.twitterImage[0]
        : result.twitterImage;
      return image.url;
    }

    return null;
  } catch (error) {
    console.warn(`Failed to fetch OG image for ${url}:`, (error as Error).message);
    return null;
  }
}

export const generatePersonalizedNewsFunction = inngest.createFunction(
  {
    id: 'generate-personalized-news',
    name: 'Generate Personalized News',
    retries: 2
  },
  { event: 'news/generate-personalized' },
  async ({ event, step }) => {
    const { userId, policyInterests, state, district, limit = 20 } = event.data;

    // Validate required fields
    if (!userId || !policyInterests || !Array.isArray(policyInterests) || policyInterests.length === 0) {
      console.error('❌ Invalid event data received:', { userId, policyInterests });
      throw new Error('Invalid event data: userId and policyInterests are required');
    }

    console.log(`📰 Generating personalized news for user ${userId}`);
    console.log(`   Interests: ${policyInterests.join(', ')}`);
    console.log(`   Location: ${state || 'N/A'}, District ${district || 'N/A'}`);

    // Step 1: Fetch personalized news using Perplexity API
    const articles = await step.run('fetch-personalized-news', async () => {
      const allArticles: NewsArticle[] = [];

      // Fetch news for each policy interest
      for (const interest of policyInterests) {
        console.log(`🔍 Fetching ${interest} news from Perplexity`);

        try {
          const prompt = `Find EXACTLY 5 recent news articles about ${interest} in U.S. policy and legislation from the past 7 days. For EACH article, include:
- title: The article headline
- url: Direct link to the article
- publishedDate: ISO date string (YYYY-MM-DD)
- summary: 2-3 sentence summary
- source: News source name (e.g., NPR, Politico, The Hill)

Output as a valid JSON array with EXACTLY 5 articles.

Focus on recent, credible news sources: congress.gov, npr.org, politico.com, thehill.com, rollcall.com, apnews.com, cnn.com, axios.com`;

          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY!}`
            },
            body: JSON.stringify({
              model: 'sonar',
              messages: [
                {
                  role: 'system',
                  content: 'You are a news aggregator. Return articles in the specified JSON schema.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.3,
              max_tokens: 2000,
              return_images: true,  // Enable image return from Perplexity
              search_domain_filter: [
                'congress.gov',
                'npr.org',
                'politico.com',
                'thehill.com',
                'rollcall.com',
                'apnews.com',
                'cnn.com',
                'axios.com'
              ],
              search_recency_filter: 'week'
            })
          });

          if (!response.ok) {
            console.warn(`⚠️  Perplexity API error for ${interest}: ${response.status}`);
            continue;
          }

          const data = await response.json() as PerplexityAPIResponse;

          // Perplexity returns images as array of objects with image_url property
          const images = data.images || [];
          console.log(`🖼️  Perplexity returned ${images.length} images for ${interest}`);

          // Use search_results for REAL URLs (not hallucinated)
          const searchResults = data.search_results || [];
          console.log(`🔗 Perplexity returned ${searchResults.length} search results with real URLs`);

          if (searchResults.length === 0) {
            console.warn(`⚠️  No search results returned for ${interest}`);
            continue;
          }

          // Validate and map search results to articles (use REAL URLs from search_results)
          let topicArticles = searchResults
            .filter(isValidSearchResult) // Type-safe validation
            .slice(0, 5)
            .map((result) => ({
              title: result.title,
              url: result.url, // REAL URL from search results (validated)
              publishedDate: result.date || new Date().toISOString().split('T')[0],
              summary: result.snippet || '',
              source: new URL(result.url).hostname.replace('www.', '')
            }));

          // Attach images to articles (Perplexity pool + OG fallback)
          console.log(`📸 Attaching images to ${topicArticles.length} articles...`);

          const articlesWithImages = await Promise.all(
            topicArticles.map(async (article, index: number) => {
              let imageUrl: string | null = null;

              // FIRST: Try Perplexity image (article-specific, most reliable)
              if (images.length > index) {
                const perplexityImage = images[index];

                // Type-safe image URL extraction
                if (typeof perplexityImage === 'string') {
                  imageUrl = perplexityImage;
                } else if (isPerplexityImage(perplexityImage)) {
                  imageUrl = perplexityImage.image_url; // TypeScript knows this is safe
                }
              }

              // FALLBACK: If no Perplexity image, try OG image from article URL
              if (!imageUrl && article.url) {
                imageUrl = await fetchOgImage(article.url);
              }

              return {
                ...article,
                imageUrl: imageUrl || undefined, // Ensure it's string | undefined
                relevantTopics: [interest]
              };
            })
          );

          const imagesFound = articlesWithImages.filter((a) => a.imageUrl).length;
          console.log(`✅ Found ${imagesFound}/${articlesWithImages.length} images`);

          allArticles.push(...articlesWithImages);
          console.log(`✅ Fetched ${articlesWithImages.length} articles for ${interest}`);

          // Rate limiting - wait between requests
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
          console.error(`❌ Error fetching ${interest} news:`, error.message);
        }
      }

      // Remove duplicates by URL
      const uniqueArticles = allArticles.filter(
        (article, index, self) =>
          index === self.findIndex(a => a.url === article.url)
      );

      // Sort by published date (newest first)
      uniqueArticles.sort((a, b) => {
        const dateA = new Date(a.publishedDate || Date.now()).getTime();
        const dateB = new Date(b.publishedDate || Date.now()).getTime();
        return dateB - dateA;
      });

      // Limit to requested number
      const limitedArticles = uniqueArticles.slice(0, limit);

      console.log(`✅ Total unique articles: ${uniqueArticles.length}, returning ${limitedArticles.length}`);

      return limitedArticles;
    });

    // Step 2: Save articles to database via Next.js API
    const savedArticles = await step.run('save-articles', async () => {
      console.log(`💾 Saving ${articles.length} articles to database`);

      try {
        const nextjsApiUrl = process.env.NEXTJS_API_URL || 'http://localhost:3000';

        const response = await fetch(`${nextjsApiUrl}/api/news/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            articles
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`⚠️  Failed to save articles: ${response.status} - ${errorText}`);
          return articles; // Return articles anyway even if save fails
        }

        const result = await response.json();
        console.log(`✅ Saved articles successfully`);

        return result.articles || articles;

      } catch (error: any) {
        console.error(`❌ Database save error: ${error.message}`);
        return articles; // Return articles anyway
      }
    });

    return {
      success: true,
      userId,
      articlesGenerated: savedArticles.length,
      policyInterests,
      articles: savedArticles
    };
  }
);
