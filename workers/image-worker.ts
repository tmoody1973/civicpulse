#!/usr/bin/env node
/**
 * Image Fetch Worker
 *
 * Background process that fetches images from Unsplash for news articles and stories.
 * Runs independently from the brief generation worker.
 *
 * Run with: npm run worker:images
 *
 * What happens:
 * 1. Worker starts and connects to Redis
 * 2. Watches the image-fetch queue for new jobs
 * 3. When job arrives, searches Unsplash for relevant image
 * 4. Saves image URL to database
 * 5. Waits for next job
 */

// Environment variables should be passed via command line or loaded externally
// No longer using dotenv here - use: export REDIS_URL=... && npm run worker:images

import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../lib/queue/redis';
import type { ImageJobData } from '../lib/queue/image-queue';
import { findBestImage, downloadImage } from '../lib/api/unsplash';

/**
 * Main job processor
 * Tries og:image first, then falls back to Unsplash
 */
async function processImageJob(job: Job<ImageJobData>) {
  console.log(`\n🖼️  Starting image fetch job ${job.id}`);
  console.log(`   Title: ${job.data.title}`);
  console.log(`   Keywords: ${job.data.keywords.join(', ')}`);

  const startTime = Date.now();

  try {
    let image: {
      url: string;
      alt_description?: string;
      description?: string;
      photographer?: string;
      photographerUrl?: string;
      id?: string;
    } | null = null;

    let imageSource: 'og' | 'unsplash' = 'unsplash';

    // Step 1: Try og:image first if articleUrl provided
    if (job.data.articleUrl) {
      await job.updateProgress(10);
      console.log(`🔍 Trying og:image from: ${job.data.articleUrl}`);

      const { fetchOgImage } = await import('../lib/images/fetch-og-image');
      const ogResult = await fetchOgImage(job.data.articleUrl);

      if (ogResult.imageUrl) {
        console.log(`✅ Found og:image`);
        image = {
          url: ogResult.imageUrl,
          alt_description: ogResult.imageAlt || job.data.title,
          description: ogResult.imageAlt || job.data.title,
          photographer: undefined,
          photographerUrl: undefined,
        };
        imageSource = 'og';
      } else {
        console.log('⚠️  No og:image found, falling back to Unsplash');
      }
    }

    // Step 2: Fallback to Unsplash if no og:image
    if (!image) {
      await job.updateProgress(20);
      console.log('🔍 Searching Unsplash...');

      image = await findBestImage(
        job.data.title,
        job.data.description,
        job.data.keywords
      );

      if (!image) {
        console.log('⚠️  No suitable image found');
        return {
          success: false,
          reason: 'No image found',
        };
      }

      console.log(`✅ Found Unsplash image by ${image.photographer}`);
      console.log(`   URL: ${image.url}`);
    }

    // Step 2: Download attribution (required by Unsplash only)
    await job.updateProgress(50);
    if (imageSource === 'unsplash' && image.id) {
      await downloadImage(image.id);
    }

    // Step 3: Save to database
    await job.updateProgress(80);
    console.log('💾 Saving to database...');

    const { executeQuery } = await import('../lib/db/client');

    // Escape single quotes for SQL
    const escapeSql = (val: any): string => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return String(val);
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // Update brief or article with image
    if (job.data.briefId) {
      const sql = `
        UPDATE briefs
        SET
          featured_image_url = ${escapeSql(image.url)},
          featured_image_alt = ${escapeSql(image.alt_description || image.description || job.data.title)},
          featured_image_photographer = ${escapeSql(image.photographer)},
          featured_image_photographer_url = ${escapeSql(image.photographerUrl)}
        WHERE id = ${escapeSql(job.data.briefId)}
      `;

      await executeQuery(sql, 'users');
      console.log(`   Updated brief ${job.data.briefId}`);
    } else if (job.data.articleId) {
      // Update news_articles table
      const sql = `
        UPDATE news_articles
        SET
          image_url = ${escapeSql(image.url)},
          image_alt = ${escapeSql(image.alt_description || image.description || job.data.title)},
          image_photographer = ${escapeSql(image.photographer)},
          image_photographer_url = ${escapeSql(image.photographerUrl)},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${escapeSql(job.data.articleId)}
      `;

      await executeQuery(sql, 'users');
      console.log(`   Updated article ${job.data.articleId}`);
    }

    // Done!
    await job.updateProgress(100);

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Job ${job.id} completed in ${totalTime}s`);

    return {
      success: true,
      imageUrl: image.url,
      photographer: image.photographer,
    };
  } catch (error: any) {
    console.error(`❌ Job ${job.id} failed:`, error.message);
    throw error; // BullMQ will handle retries
  }
}

/**
 * Create and start the worker
 */
console.log('🚀 Starting image fetch worker...');
console.log('📡 Connecting to Redis...');
console.log(`🔍 REDIS_URL: ${process.env.REDIS_URL ? `${process.env.REDIS_URL.substring(0, 30)}...` : 'NOT SET'}`);

const worker = new Worker<ImageJobData>('image-fetch', processImageJob, {
  ...getRedisConnectionOptions(),
  concurrency: 5, // Process up to 5 images concurrently
  limiter: {
    max: 50, // Max 50 requests per duration (Unsplash free tier limit)
    duration: 3600000, // 1 hour
  },
});

worker.on('ready', () => {
  console.log('✅ Worker ready and waiting for jobs!');
  console.log('👀 Watching queue: image-fetch');
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
  console.log(`   Result:`, result);
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

console.log('💡 Tip: Images are fetched in the background and added to briefs automatically');
console.log('');
