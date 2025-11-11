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

// Common policy topics to fetch news for (shared across all users)
const COMMON_TOPICS = [
  'healthcare',
  'education',
  'climate',
  'economy',
  'technology',
  'immigration',
  'defense',
  'taxes',
  'transportation',
  'housing',
  'agriculture',
  'energy',
  'criminal-justice',
  'civil-rights',
  'labor',
  'trade',
  'foreign-policy',
  'social-security',
  'veterans',
  'environment'
];

// Perplexity API Response Types
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
  images?: Array<PerplexityImage | string>;
  search_results?: PerplexitySearchResult[];
}

function isPerplexityImage(value: unknown): value is PerplexityImage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'image_url' in value &&
    typeof (value as PerplexityImage).image_url === 'string'
  );
}

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
 * Fetch OG image from article URL
 */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const { result } = await ogs({
      url,
      timeout: 5000,
      fetchOptions: {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; CivicPulseBot/1.0)'
        }
      }
    } as any); // Type assertion: retry option exists but not in types

    if (result.ogImage) {
      const image = Array.isArray(result.ogImage)
        ? result.ogImage[0]
        : result.ogImage;
      return image.url;
    }

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

/**
 * Scheduled function: Refresh news pool every 6 hours
 * Can also be triggered manually with 'news/refresh-pool' event
 */
export const refreshNewsPoolFunction = inngest.createFunction(
  {
    id: 'refresh-news-pool',
    name: 'Refresh News Pool (Scheduled)',
    retries: 2
  },
  // Run every 6 hours OR on manual trigger
  [
    { cron: '0 */6 * * *' },
    { event: 'news/refresh-pool' }
  ],
  async ({ event, step }) => {
    console.log(`🔄 Starting scheduled news pool refresh at ${new Date().toISOString()}`);
    console.log(`   Topics: ${COMMON_TOPICS.length} common policy areas`);

    // Step 1: Fetch news for all common topics
    const allArticles = await step.run('fetch-news-for-all-topics', async () => {
      const articles: NewsArticle[] = [];

      // Batch topics to reduce API calls (fetch 2 articles per topic)
      for (const topic of COMMON_TOPICS) {
        console.log(`🔍 Fetching news for: ${topic}`);

        try {
          const prompt = `Find EXACTLY 2 recent news articles about ${topic} in U.S. policy and legislation from the past 7 days. For EACH article, include:
- title: The article headline
- url: Direct link to the article
- publishedDate: ISO date string (YYYY-MM-DD)
- summary: 2-3 sentence summary
- source: News source name (e.g., NPR, Politico, The Hill)

Output as a valid JSON array with EXACTLY 2 articles.

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
              max_tokens: 1500,
              return_images: true,
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
            console.warn(`⚠️  Perplexity API error for ${topic}: ${response.status}`);
            continue;
          }

          const data = await response.json() as PerplexityAPIResponse;
          const images = data.images || [];
          const searchResults = data.search_results || [];

          if (searchResults.length === 0) {
            console.warn(`⚠️  No search results for ${topic}`);
            continue;
          }

          // Map search results to articles with images
          const topicArticles = searchResults
            .filter(isValidSearchResult)
            .slice(0, 2)
            .map((result) => ({
              title: result.title,
              url: result.url,
              publishedDate: result.date || new Date().toISOString().split('T')[0],
              summary: result.snippet || '',
              source: new URL(result.url).hostname.replace('www.', '')
            }));

          // Attach images - prioritize article's actual OG image
          const articlesWithImages = await Promise.all(
            topicArticles.map(async (article, index: number) => {
              let imageUrl: string | null = null;

              // Try OG image first (actual article's featured image)
              if (article.url) {
                console.log(`  🖼️  Fetching OG image for: ${article.url.substring(0, 60)}...`);
                imageUrl = await fetchOgImage(article.url);
                if (imageUrl) {
                  console.log(`    ✅ Got OG image: ${imageUrl.substring(0, 60)}...`);
                } else {
                  console.log(`    ⚠️  No OG image found`);
                }
              }

              // Fallback to Perplexity image only if OG fetch fails
              if (!imageUrl && images.length > index) {
                console.log(`    ℹ️  Using Perplexity fallback image`);
                const perplexityImage = images[index];
                if (typeof perplexityImage === 'string') {
                  imageUrl = perplexityImage;
                } else if (isPerplexityImage(perplexityImage)) {
                  imageUrl = perplexityImage.image_url;
                }
              }

              return {
                ...article,
                imageUrl: imageUrl || undefined,
                relevantTopics: [topic]
              };
            })
          );

          articles.push(...articlesWithImages);
          console.log(`✅ Fetched ${articlesWithImages.length} articles for ${topic}`);

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
          console.error(`❌ Error fetching ${topic} news:`, error.message);
        }
      }

      // Remove duplicates by URL
      const uniqueArticles = articles.filter(
        (article, index, self) =>
          index === self.findIndex(a => a.url === article.url)
      );

      console.log(`✅ Total unique articles fetched: ${uniqueArticles.length}`);
      return uniqueArticles;
    });

    // Step 2: Save articles to database
    const savedCount = await step.run('save-to-database', async () => {
      console.log(`💾 Saving ${allArticles.length} articles to database`);

      try {
        const nextjsApiUrl = process.env.NEXTJS_API_URL || 'http://localhost:3000';

        const response = await fetch(`${nextjsApiUrl}/api/news/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'system', // System-generated articles
            articles: allArticles
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`⚠️  Failed to save articles: ${response.status} - ${errorText}`);
          return 0;
        }

        const result = await response.json();
        console.log(`✅ Saved ${result.articles?.length || 0} articles`);
        return result.articles?.length || 0;

      } catch (error: any) {
        console.error(`❌ Database save error: ${error.message}`);
        return 0;
      }
    });

    // Step 3: Clean up old articles (older than 7 days)
    await step.run('cleanup-old-articles', async () => {
      console.log('🧹 Cleaning up articles older than 7 days');

      try {
        const nextjsApiUrl = process.env.NEXTJS_API_URL || 'http://localhost:3000';

        const response = await fetch(`${nextjsApiUrl}/api/news/cleanup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maxAgeDays: 7 })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Deleted ${result.deletedCount || 0} old articles`);
        }
      } catch (error: any) {
        console.warn('⚠️  Cleanup failed (non-fatal):', error.message);
      }
    });

    return {
      success: true,
      articlesFetched: allArticles.length,
      articlesSaved: savedCount,
      topics: COMMON_TOPICS,
      timestamp: new Date().toISOString()
    };
  }
);
