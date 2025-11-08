#!/usr/bin/env node
/**
 * Brief Generation Worker
 *
 * This is a background process that picks up jobs from the queue
 * and generates daily briefs.
 *
 * Run with: npm run worker
 *
 * What happens:
 * 1. Worker starts and connects to Redis
 * 2. Watches the queue for new jobs
 * 3. When job arrives, processes it (generates brief)
 * 4. Updates progress as it goes (0% → 20% → 40% → 60% → 80% → 100%)
 * 5. Saves result to database
 * 6. Waits for next job
 *
 * You'll see LIVE console output for everything!
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../lib/queue/redis';
import type { BriefJobData } from '../lib/queue/brief-queue';
import { nanoid } from 'nanoid';

// Import brief generation logic
import { generateDialogue, estimateAudioDuration } from '../lib/ai/elevenlabs';
import { uploadPodcast } from '../lib/storage/vultr';
import { queueAllBriefImages } from '../lib/queue/image-integration';

/**
 * Helper to get user data from SQL and SmartMemory
 */
async function getUserData(userId: string) {
  const { executeQuery } = await import('../lib/db/client');

  // Escape single quotes in userId to prevent SQL injection
  const escapedUserId = userId.replace(/'/g, "''");

  // Step 1: Get user info including policy interests from SQL
  const result = await executeQuery(
    `SELECT id, email, name, state, district, interests FROM users WHERE id = '${escapedUserId}'`,
    'users'
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  // Step 2: Parse policy interests from the interests column
  let policyAreas: string[] = [];

  try {
    if (user.interests) {
      // Parse JSON if it's a string, otherwise use as-is
      policyAreas = typeof user.interests === 'string' ? JSON.parse(user.interests) : user.interests;
      console.log(`✅ Found ${policyAreas.length} policy interests from users.interests column`);
    } else {
      console.log('⚠️  No policy interests found for user');
    }
  } catch (error: any) {
    console.log('⚠️  Could not parse policy interests:', error.message);
    // Continue with empty array - not critical for brief generation
  }

  const userPreferences = {
    policyAreas,
    location: user.state || 'United States',
    state: user.state || null,
    district: user.district || null,
  };

  return { user, userPreferences };
}

/**
 * Main job processor
 * This function does all the work
 */
async function processBriefJob(job: Job<BriefJobData>) {
  console.log(`\n🎯 Starting job ${job.id}`);
  console.log(`   User: ${job.data.userEmail}`);
  console.log(`   Time: ${new Date().toLocaleTimeString()}`);

  const startTime = Date.now();

  try {
    // Step 1: Get user data (10%)
    await job.updateProgress(10);
    console.log('📋 Fetching user preferences...');

    const { user, userPreferences } = await getUserData(job.data.userId);

    // Import all functions from the API route (they're defined there, not in separate modules)
    const {
      fetchNewsArticles,
      fetchPrioritizedBills,
      generateBriefScript,
      generateWrittenDigest,
      extractBriefMetadata,
    } = await import('../app/api/briefs/generate-daily/route');

    // Step 2: Fetch news articles (20%)
    await job.updateProgress(20);
    console.log('📰 Fetching news articles...');

    const newsArticles = await fetchNewsArticles(userPreferences.policyAreas, user.id);
    console.log(`   Found ${newsArticles.length} news articles`);

    // Step 3: Query bills (30%)
    await job.updateProgress(30);
    console.log('📜 Querying bills from Congress...');

    const bills = await fetchPrioritizedBills(userPreferences.policyAreas, user.id);
    console.log(`   Found ${bills.length} relevant bills`);

    // Step 4: Generate dialogue script with Claude (40%)
    await job.updateProgress(40);
    console.log('✍️  Generating dialogue script with Claude AI...');

    const dialogueScript = await generateBriefScript(newsArticles, bills, userPreferences.policyAreas);
    console.log(`   Generated ${dialogueScript.length} dialogue lines`);

    // Step 5: Generate audio with ElevenLabs (60%)
    await job.updateProgress(60);
    console.log('🎵 Generating audio with ElevenLabs (this takes 5-10 minutes)...');

    const audioBuffer = await generateDialogue(dialogueScript);
    const estimatedDuration = estimateAudioDuration(dialogueScript);
    console.log(`   Generated ${Math.round(audioBuffer.length / 1024 / 1024 * 10) / 10}MB audio (~${Math.round(estimatedDuration / 60)} min)`);

    // Step 6: Upload to Vultr CDN (80%)
    await job.updateProgress(80);
    console.log('☁️  Uploading to Vultr CDN...');

    const audioUrl = await uploadPodcast(audioBuffer, {
      userId: user.id,
      type: 'daily',
      duration: estimatedDuration,
      billsCovered: bills.map(b => b.id),
      generatedAt: new Date(),
    });
    console.log(`   Uploaded: ${audioUrl}`);

    // Step 7: Generate written digest (90%)
    await job.updateProgress(90);
    console.log('📝 Generating written digest...');

    const writtenDigest = await generateWrittenDigest(newsArticles, bills);

    // Extract metadata for featured brief card (NOW ASYNC - uses Claude AI)
    console.log('🎯 Extracting metadata with AI-generated title...');
    const metadata = await extractBriefMetadata(newsArticles, bills, writtenDigest);
    console.log(`📊 Extracted metadata: ${metadata.headline}`);

    // Step 8: Save to database (95%)
    await job.updateProgress(95);
    console.log('💾 Saving to database...');

    const { executeQuery: saveToDb } = await import('../lib/db/client');

    // Generate unique brief ID
    const briefId = nanoid();

    const transcript = dialogueScript
      .map(d => `${d.host.toUpperCase()}: ${d.text}`)
      .join('\n\n');

    const billsCoveredJson = JSON.stringify(
      bills.map(b => ({
        id: b.id,
        title: b.title,
        sponsor: b.sponsor_name,
      }))
    );

    const policyAreasJson = JSON.stringify(userPreferences.policyAreas);

    // Escape single quotes in values for SQL
    const escapeSql = (val: any): string => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return String(val);
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    const sql = `
      INSERT INTO briefs (
        id, user_id, type, audio_url, duration, transcript, bills_covered, written_digest, policy_areas,
        title, headline, excerpt, category, author, featured_image_url, generated_at
      )
      VALUES (
        ${escapeSql(briefId)},
        ${escapeSql(user.id)},
        ${escapeSql('daily')},
        ${escapeSql(audioUrl)},
        ${escapeSql(estimatedDuration)},
        ${escapeSql(transcript)},
        ${escapeSql(billsCoveredJson)},
        ${escapeSql(writtenDigest)},
        ${escapeSql(policyAreasJson)},
        ${escapeSql(metadata.title)},
        ${escapeSql(metadata.headline)},
        ${escapeSql(metadata.excerpt)},
        ${escapeSql(metadata.category)},
        ${escapeSql('Civic Pulse AI')},
        ${escapeSql(metadata.featured_image_url)},
        CURRENT_TIMESTAMP
      )
    `;

    await saveToDb(sql, 'users');

    // Queue image fetching for brief and all news articles
    console.log('📸 Queueing image fetch jobs...');
    await queueAllBriefImages({
      briefId,
      briefTitle: 'Daily Civic Brief',
      briefDescription: writtenDigest.substring(0, 200),
      newsArticles,
      keywords: userPreferences.policyAreas,
    });

    // Done! (100%)
    await job.updateProgress(100);

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Job ${job.id} completed in ${totalTime}s (${Math.round(totalTime / 60)} min)`);
    console.log(`   Audio URL: ${audioUrl}`);

    return {
      success: true,
      audioUrl,
      duration: estimatedDuration,
      billsCovered: bills.length,
    };
  } catch (error: any) {
    console.error(`❌ Job ${job.id} failed:`, error.message);
    throw error; // BullMQ will handle retries
  }
}

/**
 * Create and start the worker
 */
console.log('🚀 Starting brief generation worker...');
console.log('📡 Connecting to Redis...');

const worker = new Worker<BriefJobData>('brief-generation', processBriefJob, {
  ...getRedisConnectionOptions(),
  concurrency: 1, // Process one job at a time
  limiter: {
    max: 10, // Max 10 jobs per duration
    duration: 60000, // 1 minute
  },
});

worker.on('ready', () => {
  console.log('✅ Worker ready and waiting for jobs!');
  console.log('👀 Watching queue: brief-generation');
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

console.log('💡 Tip: You can see all jobs at http://localhost:3000/admin/bull-board (optional)');
console.log('');
