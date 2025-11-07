/**
 * Perplexity API Client
 *
 * Provides AI-powered search and article discovery
 * Uses Perplexity's Sonar model for news searches
 */

import ogs from 'open-graph-scraper';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai';

export interface PerplexitySearchParams {
  query: string;
  recency_filter?: 'day' | 'week' | 'month' | 'year';
  return_images?: boolean;
  return_related_questions?: boolean;
}

export interface PerplexityArticle {
  title: string;
  url: string;
  summary: string;
  source: string;
  publishedDate: string;
  relevantTopics: string[];
  imageUrl?: string; // Featured image for the article
  extraSnippets?: string[]; // Additional context snippets from Brave Search for richer dialogue
}

export interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role: string;
      content: string;
    };
  }>;
}

/**
 * Search for news articles using Perplexity AI
 */
export async function searchNews(params: PerplexitySearchParams): Promise<string> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY environment variable is not set');
  }

  const response = await fetch(`${PERPLEXITY_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar', // Perplexity Sonar model (Llama 3.3 70B)
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that finds and summarizes recent news articles about congressional legislation and politics. Return results as a JSON array with article URLs and featured images.',
        },
        {
          role: 'user',
          content: params.query,
        },
      ],
      max_tokens: 4000,
      temperature: 0.2, // Low temperature for factual accuracy
      top_p: 0.9,
      return_citations: true,
      return_images: true, // Always return images for news articles
      return_related_questions: params.return_related_questions ?? false,
      search_recency_filter: params.recency_filter ?? 'week',
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
  }

  const data: PerplexityResponse = await response.json();

  // Extract the content from the response
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content returned from Perplexity API');
  }

  return content;
}

/**
 * Build a smart news search prompt based on user interests and location
 */
export function buildPersonalizedNewsPrompt(
  interests: string[],
  state?: string,
  district?: string
): string {
  const topics = interests.map(interest => {
    // Map IDs to human-readable topics
    const topicMap: Record<string, string> = {
      'healthcare': 'healthcare reform and medical policy',
      'education': 'education policy and student funding',
      'science': 'scientific research and innovation policy',
      'technology': 'technology regulation and digital privacy',
      'climate': 'climate change and environmental legislation',
      'economy': 'economic policy and job creation',
      'business': 'business regulation and trade policy',
      'taxes': 'tax reform and fiscal policy',
      'immigration': 'immigration reform and border policy',
      'housing': 'housing policy and affordability',
      'defense': 'defense spending and military policy',
      'transportation': 'transportation and infrastructure',
      'agriculture': 'agriculture and food policy',
      'social': 'social services and welfare programs',
      'civil-rights': 'civil rights and justice reform',
    };
    return topicMap[interest] || interest;
  }).join(', ');

  let prompt = `Find 10 recent news articles about U.S. activity related to: ${topics}.`;

  if (state && district) {
    prompt += `\n\nAlso include articles about legislation affecting ${state} and district ${district}.`;
  }

  prompt += `\n\nFor each article, return a JSON array with this exact format:
[
  {
    "title": "Article headline",
    "url": "Full article URL",
    "summary": "2-3 sentence summary focusing on legislative impact",
    "source": "Publication name",
    "publishedDate": "YYYY-MM-DD format",
    "relevantTopics": ["topic1", "topic2"],
    "imageUrl": "URL to featured image (if available)"
  }
]

Requirements:
- Articles must be from the last 7 days
- Prioritize sites like politico.com, thehill.com, npr.org, cnn.com, nytimes.com, washingtonpost.com but can include other credible news sources
- Include featured images when available from the article
- Return ONLY the JSON array, no other text`;

  return prompt;
}

/**
 * Fetch Open Graph image from article URL
 */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const { result } = await ogs({ url, timeout: 5000 });

    // Try multiple Open Graph image fields
    const getImageUrl = (imageData: any): string | undefined => {
      if (Array.isArray(imageData)) {
        return imageData[0]?.url;
      }
      return imageData?.url;
    };

    const imageUrl = getImageUrl(result.ogImage) || getImageUrl(result.twitterImage) || null;

    return imageUrl;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to fetch OG image for ${url}:`, errorMessage);
    return null;
  }
}

/**
 * Fetch relevant image from Unsplash based on article topic
 */
async function getUnsplashImage(topics: string[], articleTitle: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    console.warn('⚠️  UNSPLASH_ACCESS_KEY not set, skipping Unsplash fallback');
    return null;
  }

  try {
    // Build search query from topics and title
    const primaryTopic = topics[0] || 'news';
    // Extract key words from title (first 3-4 words, remove common words)
    const titleWords = articleTitle
      .split(' ')
      .filter(word => word.length > 3 && !['the', 'and', 'for', 'with'].includes(word.toLowerCase()))
      .slice(0, 3)
      .join(' ');

    const searchQuery = titleWords || primaryTopic.replace('-', ' ');

    console.log(`🖼️  Searching Unsplash for: "${searchQuery}"`);

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const imageUrl = data.results[0].urls.regular; // 1080px width
      console.log(`✅ Found Unsplash image: ${imageUrl.substring(0, 50)}...`);
      return imageUrl;
    }

    console.log(`⚠️  No Unsplash results for "${searchQuery}"`);
    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to fetch Unsplash image:`, errorMessage);
    return null;
  }
}

/**
 * Generate placeholder image URL based on topics (last resort fallback)
 */
export function getPlaceholderImage(topics: string[]): string {
  const topicColors: Record<string, string> = {
    'healthcare': '4A90E2',
    'education': 'F5A623',
    'science': '7ED321',
    'technology': '50E3C2',
    'climate': '417505',
    'economy': 'BD10E0',
    'business': '9013FE',
    'taxes': 'D0021B',
    'immigration': 'F8E71C',
    'housing': 'B8E986',
    'defense': '8B572A',
    'transportation': '4A4A4A',
    'agriculture': '7ED321',
    'social': 'F5A623',
    'civil-rights': 'D0021B',
  };

  const primaryTopic = topics[0] || 'default';
  const color = topicColors[primaryTopic] || '4A90E2';
  const topicLabel = encodeURIComponent(primaryTopic.replace('-', ' '));

  return `https://via.placeholder.com/600x400/${color}/FFFFFF?text=${topicLabel}`;
}

/**
 * Parse Perplexity response and extract articles
 */
export function parsePerplexityArticles(content: string): PerplexityArticle[] {
  try {
    // Remove markdown code blocks if present
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

    const articles = JSON.parse(jsonString);

    if (!Array.isArray(articles)) {
      throw new Error('Response is not an array');
    }

    return articles.map((article: any) => ({
      title: article.title || '',
      url: article.url || '',
      summary: article.summary || article.description || '',
      source: article.source || 'Unknown',
      publishedDate: article.publishedDate || article.published_date || new Date().toISOString().split('T')[0],
      relevantTopics: article.relevantTopics || article.relevant_topics || [],
      imageUrl: article.imageUrl || article.image_url || article.image || null,
    }));
  } catch (error) {
    console.error('Failed to parse Perplexity response:', error);
    console.error('Content:', content);
    throw new Error('Failed to parse articles from Perplexity response');
  }
}

/**
 * Enrich articles with Open Graph images
 */
export async function enrichArticlesWithImages(
  articles: PerplexityArticle[]
): Promise<PerplexityArticle[]> {
  console.log(`🖼️  Fetching images for ${articles.length} articles (OG → Unsplash → Placeholder)...`);

  const enrichedArticles = await Promise.all(
    articles.map(async (article) => {
      // Skip if article already has an image
      if (article.imageUrl) {
        console.log(`✅ Article already has image: ${article.title.substring(0, 50)}...`);
        return article;
      }

      // Tier 1: Try to fetch OG image from article URL
      console.log(`🔍 Trying OG image for: ${article.title.substring(0, 50)}...`);
      const ogImage = await fetchOgImage(article.url);

      if (ogImage) {
        console.log(`✅ Found OG image`);
        return {
          ...article,
          imageUrl: ogImage,
        };
      }

      // Tier 2: Try Unsplash based on article topic and title
      console.log(`🔍 Trying Unsplash for: ${article.title.substring(0, 50)}...`);
      const unsplashImage = await getUnsplashImage(article.relevantTopics, article.title);

      if (unsplashImage) {
        return {
          ...article,
          imageUrl: unsplashImage,
        };
      }

      // Tier 3: Last resort - use placeholder based on topics
      console.log(`⚠️  Using placeholder for: ${article.title.substring(0, 50)}...`);
      const placeholderImage = getPlaceholderImage(article.relevantTopics);

      return {
        ...article,
        imageUrl: placeholderImage,
      };
    })
  );

  const imageCount = enrichedArticles.filter(a => a.imageUrl).length;
  console.log(`✅ Added images to ${imageCount}/${articles.length} articles`);

  return enrichedArticles;
}

/**
 * Main function: Get personalized news for a user
 */
export async function getPersonalizedNews(
  interests: string[],
  state?: string,
  district?: string
): Promise<PerplexityArticle[]> {
  const prompt = buildPersonalizedNewsPrompt(interests, state, district);

  console.log('🔍 Perplexity search prompt:', prompt.substring(0, 200) + '...');

  const content = await searchNews({
    query: prompt,
    recency_filter: 'week',
  });

  const articles = parsePerplexityArticles(content);

  console.log(`✅ Found ${articles.length} personalized articles`);

  // Enrich articles with Open Graph images
  const enrichedArticles = await enrichArticlesWithImages(articles);

  return enrichedArticles;
}
