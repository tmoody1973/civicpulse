/**
 * News Generation Worker (Observer)
 *
 * Processes personalized news jobs from news_queue
 * Takes 20-30 seconds per job (fast news + images)
 *
 * Steps:
 * 1. Check cache for existing news
 * 2. Fetch news from Brave Search API
 * 3. Fetch topic images from Pexels API
 * 4. Save articles to database
 * 5. Cache results for 24 hours
 */

import { Each, Message } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

interface NewsJobData {
  userId: string;
  userEmail: string;
  interests: string[];
  state?: string;
  district?: string;
  limit: number;
  forceRefresh: boolean;
}

export default class extends Each<NewsJobData, Env> {
  async process(message: Message<NewsJobData>): Promise<void> {
    const startTime = Date.now();
    const job = message.body;

    console.log(`\n🎯 Processing news for ${job.userEmail}`);
    console.log(`   User ID: ${job.userId}`);
    console.log(`   Interests: ${job.interests.join(', ')}`);
    console.log(`   Limit: ${job.limit}`);

    try {
      // Step 1: Check cache (unless force refresh)
      if (!job.forceRefresh) {
        console.log('\n🔍 Step 1: Checking cache...');
        const cached = await getCachedNews(job.userId, job.interests, job.limit, this.env);

        if (cached && cached.length > 0) {
          console.log(`   ✅ Found ${cached.length} cached articles (skipping fetch)`);
          message.ack(); // Job complete - using cache
          return;
        }

        console.log('   No cache found, fetching fresh news...');
      }

      // Step 2: Fetch news from Brave Search API
      console.log('\n📰 Step 2: Fetching news from Brave Search...');
      const freshArticles = await getPersonalizedNewsFast(
        job.interests,
        job.state,
        job.district,
        this.env
      );
      console.log(`   ✅ Found ${freshArticles.length} articles`);

      // Step 3: Get topic images from Pexels
      console.log('\n📸 Step 3: Fetching topic images...');

      // Check which topics already have images in Netlify Blobs
      const existingImages = await getTopicImages(job.interests, this.env);
      console.log(`   ✅ Found ${existingImages.length} existing images`);

      const missingTopics = await getMissingTopicImages(job.interests, this.env);
      console.log(`   🔍 Need ${missingTopics.length} missing images`);

      // Fetch only missing topic images
      let newTopicImages: any[] = [];
      if (missingTopics.length > 0) {
        console.log('   🖼️  Fetching missing images from Pexels...');

        const fetchedImages = await Promise.all(
          missingTopics.map(async (interest: string) => {
            try {
              const image = await getRandomPhoto(interest, this.env);
              if (image) {
                console.log(`      ✅ Fetched image for ${interest}`);
                return {
                  topic: interest,
                  imageUrl: image.url,
                  imageAlt: image.alt || `${interest} news`,
                  photographer: image.photographer,
                  photographerUrl: image.photographerUrl,
                };
              }
            } catch (error) {
              console.log(`      ⚠️  Failed to fetch image for ${interest}`);
            }
            return null;
          })
        );

        newTopicImages = fetchedImages.filter((img): img is NonNullable<typeof img> => img !== null);

        if (newTopicImages.length > 0) {
          await saveTopicImages(newTopicImages, this.env);
          console.log(`   💾 Saved ${newTopicImages.length} new images`);
        }
      }

      const allTopicImages = [...existingImages, ...newTopicImages];
      console.log(`   ✅ Total images: ${allTopicImages.length}/${job.interests.length}`);

      // Step 4: Save articles to database
      console.log('\n💾 Step 4: Saving articles to database...');
      const savedArticles = await saveNewsArticles(freshArticles, this.env);
      console.log(`   ✅ Saved ${savedArticles.length} articles`);

      // Step 5: Cache results for 24 hours
      console.log('\n💾 Step 5: Caching results...');
      await storeArticlesInCache(job.userId, savedArticles, 24, this.env);

      // Success! Acknowledge message
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n✅ News generation completed in ${totalTime}s`);
      console.log(`   Articles: ${savedArticles.length}`);
      console.log(`   Images: ${allTopicImages.length}`);

      message.ack(); // Mark as successfully processed

    } catch (error: any) {
      console.error(`\n❌ News generation failed:`, error);
      console.error(`   User: ${job.userEmail}`);
      console.error(`   Error: ${error.message}`);

      // Retry with short delay
      message.retry({ delaySeconds: 60 }); // Retry in 1 minute
    }
  }
}

export interface Body extends NewsJobData {}

// ====================
// Helper Functions
// ====================
// (These will import from the main app's lib/ directory)

async function getCachedNews(
  userId: string,
  interests: string[],
  limit: number,
  env: Env
): Promise<any[] | null> {
  // Check cache for existing news
  // This is a placeholder - actual implementation will import from ../lib/news/cache
  return null;
}

async function getPersonalizedNewsFast(
  interests: string[],
  state?: string,
  district?: string,
  env?: Env
): Promise<any[]> {
  // Fetch news from Brave Search API
  // This is a placeholder - actual implementation will import from ../lib/api/cerebras-tavily
  return [];
}

async function getTopicImages(interests: string[], env: Env): Promise<any[]> {
  // Get existing topic images from Netlify Blobs
  // This is a placeholder - actual implementation will import from ../lib/db/topic-images
  return [];
}

async function getMissingTopicImages(interests: string[], env: Env): Promise<string[]> {
  // Find topics that need images
  // This is a placeholder - actual implementation will import from ../lib/db/topic-images
  return [];
}

async function getRandomPhoto(topic: string, env: Env): Promise<any> {
  // Fetch random photo from Pexels API
  // This is a placeholder - actual implementation will import from ../lib/api/pexels
  return null;
}

async function saveTopicImages(images: any[], env: Env): Promise<void> {
  // Save topic images to Netlify Blobs
  // This is a placeholder - actual implementation will import from ../lib/db/topic-images
}

async function saveNewsArticles(articles: any[], env: Env): Promise<any[]> {
  // Save articles to database
  // This is a placeholder - actual implementation will import from ../lib/db/news-articles
  return [];
}

async function storeArticlesInCache(
  userId: string,
  articles: any[],
  hours: number,
  env: Env
): Promise<void> {
  // Store in cache for 24 hours
  // This is a placeholder - actual implementation will import from ../lib/news/cache
}
