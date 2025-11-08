#!/usr/bin/env node
/**
 * Personalized News Worker
 *
 * This is a background process that picks up news generation jobs from the queue.
 *
 * Run with: npm run worker:news
 *
 * What happens:
 * 1. Worker starts and connects to Redis
 * 2. Watches the queue for new jobs
 * 3. When job arrives, processes it (fetches news + images - takes 20-30s)
 * 4. Updates progress as it goes (0% → 25% → 50% → 75% → 100%)
 * 5. Saves result to database
 * 6. Waits for next job
 *
 * This eliminates Netlify timeout issues by running in background.
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../lib/queue/redis';
import type { NewsJobData } from '../lib/queue/news-queue';

/**
 * Main job processor
 * This function does all the work
 */
async function processNewsJob(job: Job<NewsJobData>) {
  console.log(`\n🎯 Starting news job ${job.id}`);
  console.log(`   User: ${job.data.userEmail}`);
  console.log(`   Interests: ${job.data.interests.join(', ')}`);
  console.log(`   Time: ${new Date().toLocaleTimeString()}`);

  const startTime = Date.now();

  try {
    // Step 1: Get profile data (10%)
    await job.updateProgress(10);
    console.log('📋 Fetching user profile...');

    const { getProfile } = await import('../lib/news/personalized-news-profile');

    const profile = await getProfile(
      job.data.userId,
      job.data.interests,
      job.data.state,
      job.data.district
    );

    console.log(`   Profile loaded: ${profile.policyInterests.length} interests`);

    // Step 2: Check cache (15%)
    await job.updateProgress(15);
    console.log('🔍 Checking cache...');

    const { getCachedNews } = await import('../lib/news/cache');

    if (!job.data.forceRefresh) {
      const cached = await getCachedNews(job.data.userId);
      if (cached && cached.length > 0) {
        console.log(`✅ Found ${cached.length} cached articles (skipping fetch)`);
        await job.updateProgress(100);
        return {
          success: true,
          source: 'cache',
          count: cached.length,
          articles: cached,
        };
      }
    }

    console.log('   No cache found, fetching fresh news...');

    // Step 3: Fetch news from Brave Search (50%)
    await job.updateProgress(25);
    console.log('📰 Fetching news from Brave Search API...');

    const { getPersonalizedNewsFast } = await import('../lib/news/brave-news');

    const freshArticles = await getPersonalizedNewsFast(
      profile.policyInterests,
      profile.location?.state,
      profile.location?.district
    );

    console.log(`   Found ${freshArticles.length} articles`);

    // Step 4: Get topic images from Netlify Blobs (75%)
    await job.updateProgress(50);
    console.log('📸 Fetching topic images...');

    const {
      getTopicImages,
      getMissingTopicImages,
      saveTopicImages,
    } = await import('../lib/news/topic-images');

    // Get existing images from Netlify Blobs
    const existingImages = await getTopicImages(profile.policyInterests);
    console.log(`   ✅ Found ${existingImages.length} existing images`);

    // Find topics that need images
    const missingTopics = await getMissingTopicImages(profile.policyInterests);
    console.log(`   🔍 Need ${missingTopics.length} missing images`);

    // Fetch only missing topic images from Pexels
    let newTopicImages: Array<{
      topic: string;
      imageUrl: string;
      imageAlt: string;
      photographer: string;
      photographerUrl: string;
    }> = [];

    if (missingTopics.length > 0) {
      await job.updateProgress(60);
      console.log('🖼️  Fetching missing images from Pexels...');

      const { getRandomPhoto } = await import('../lib/api/pexels');

      const fetchedImages = await Promise.all(
        missingTopics.map(async (interest: string) => {
          try {
            const image = await getRandomPhoto(interest);
            if (image) {
              console.log(`   ✅ Fetched image for ${interest}`);
              return {
                topic: interest,
                imageUrl: image.url,
                imageAlt: image.alt || `${interest} news`,
                photographer: image.photographer,
                photographerUrl: image.photographerUrl,
              };
            }
          } catch (error) {
            console.log(`   ⚠️  Failed to fetch image for ${interest}`);
          }
          return null;
        })
      );

      newTopicImages = fetchedImages.filter((img): img is NonNullable<typeof img> => img !== null);

      // Save newly fetched images to Netlify Blobs
      if (newTopicImages.length > 0) {
        await saveTopicImages(newTopicImages);
        console.log(`   💾 Saved ${newTopicImages.length} new images`);
      }
    }

    // Combine existing + new images
    const allTopicImages = [
      ...existingImages.map(img => ({
        topic: img.topic,
        imageUrl: img.imageUrl,
        imageAlt: img.imageAlt,
        photographer: img.photographer,
        photographerUrl: img.photographerUrl,
      })),
      ...newTopicImages
    ];

    console.log(`   ✅ Total images: ${allTopicImages.length}/${profile.policyInterests.length}`);

    // Step 5: Save to database (90%)
    await job.updateProgress(75);
    console.log('💾 Saving articles to database...');

    const { saveNewsArticles } = await import('../lib/news/save');

    interface NewsArticleInput {
      title: string;
      url: string;
      summary: string;
      source: string;
      publishedDate: string;
      relevantTopics: string[];
    }

    const newsArticleInputs: NewsArticleInput[] = freshArticles.map(article => ({
      title: article.title,
      url: article.url,
      summary: article.summary || '',
      source: article.source || 'Unknown',
      publishedDate: article.publishedDate || new Date().toISOString(),
      relevantTopics: article.relevantTopics || [],
    }));

    let savedArticles;
    try {
      savedArticles = await saveNewsArticles(newsArticleInputs);
      console.log(`   ✅ Saved ${savedArticles.length} articles`);
    } catch (saveError: any) {
      console.error('   ⚠️  Failed to save articles (non-fatal):', saveError.message);
      // If save fails, return fresh articles anyway
      savedArticles = freshArticles.map((article, index) => ({
        id: `temp-${index}`,
        ...article,
      }));
    }

    // Step 6: Cache the results (95%)
    await job.updateProgress(90);
    console.log('💾 Caching results...');

    const { setCachedNews } = await import('../lib/news/cache');
    await setCachedNews(job.data.userId, savedArticles);

    // Done! (100%)
    await job.updateProgress(100);

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Job ${job.id} completed in ${totalTime}s`);
    console.log(`   Articles: ${savedArticles.length}`);
    console.log(`   Images: ${allTopicImages.length}`);

    return {
      success: true,
      source: 'fresh',
      count: savedArticles.length,
      articles: savedArticles,
      topicImages: allTopicImages,
      processingTime: totalTime,
    };
  } catch (error: any) {
    console.error(`❌ Job ${job.id} failed:`, error.message);
    throw error; // BullMQ will handle retries
  }
}

/**
 * Create and start the worker
 */
console.log('🚀 Starting personalized news worker...');
console.log('📡 Connecting to Redis...');

const worker = new Worker<NewsJobData>('news-generation', processNewsJob, {
  ...getRedisConnectionOptions(),
  concurrency: 2, // Process 2 jobs at a time (news is faster than brief generation)
  limiter: {
    max: 20, // Max 20 jobs per duration
    duration: 60000, // 1 minute
  },
});

worker.on('ready', () => {
  console.log('✅ Worker ready and waiting for jobs!');
  console.log('👀 Watching queue: news-generation');
  console.log('');
});

worker.on('active', (job) => {
  console.log(`\n▶️  Job ${job.id} started`);
});

worker.on('progress', (job, progress) => {
  console.log(`   Progress: ${progress}%`);
});

worker.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed`);
  console.log(`   Articles: ${result.count}, Source: ${result.source}`);
  console.log('');
});

worker.on('failed', (job, error) => {
  console.error(`❌ Job ${job?.id} failed:`, error.message);
  console.error(`   Attempt ${job?.attemptsMade} of ${job?.opts.attempts}`);
  console.log('');
});

worker.on('error', (error) => {
  console.error('❌ Worker error:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏸️  Shutting down worker...');
  await worker.close();
  console.log('✅ Worker stopped');
  process.exit(0);
});

console.log('💡 Tip: You can monitor jobs at http://localhost:3000/admin/bull-board (optional)');
console.log('');
