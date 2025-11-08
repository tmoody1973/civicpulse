/**
 * Netlify Background Function: Process Brief Generation Job
 *
 * This is invoked by the scheduled function to process individual brief jobs.
 * Background Functions can run for up to 15 minutes (vs 10s for regular functions).
 *
 * Flow:
 * 1. Scheduled function queues jobs
 * 2. For each job, invokes this background function
 * 3. This function processes the brief (fetches news, generates audio, etc.)
 * 4. Updates database with result
 */

import type { HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';

// Import brief generation logic
import { executeQuery } from '../../lib/db/client';
import { generateDialogue, estimateAudioDuration } from '../../lib/ai/elevenlabs';
import { uploadPodcast } from '../../lib/storage/vultr';
import { nanoid } from 'nanoid';

interface BriefJobData {
  userId: string;
  userEmail: string;
  forceRegenerate?: boolean;
}

/**
 * Main handler - processes a single brief generation job
 */
export const handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  console.log('🎯 Processing brief generation job...');

  try {
    // Parse job data
    const jobData: BriefJobData = JSON.parse(event.body || '{}');
    const { userId, userEmail } = jobData;

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log(`   User: ${userEmail || userId}`);
    const startTime = Date.now();

    // Step 1: Get user data
    console.log('📋 Fetching user preferences...');

    const userResult = await executeQuery(
      `SELECT id, email, name, state, district, interests
       FROM users
       WHERE id = '${userId.replace(/'/g, "''")}'`,
      'users'
    );

    const user = userResult.rows[0];
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Parse policy interests
    let policyAreas: string[] = [];
    try {
      if (user.interests) {
        policyAreas = typeof user.interests === 'string' ? JSON.parse(user.interests) : user.interests;
      }
    } catch (error) {
      console.warn('Could not parse policy interests:', error);
    }

    const userPreferences = {
      policyAreas,
      location: user.state || 'United States',
      state: user.state || null,
      district: user.district || null,
    };

    // Import generation functions
    const {
      fetchNewsArticles,
      fetchPrioritizedBills,
      generateBriefScript,
      generateWrittenDigest,
      extractBriefMetadata,
    } = await import('../../app/api/briefs/generate-daily/route');

    // Step 2: Fetch news articles
    console.log('📰 Fetching news articles...');
    const newsArticles = await fetchNewsArticles(userPreferences.policyAreas, user.id);
    console.log(`   Found ${newsArticles.length} news articles`);

    // Step 3: Query bills
    console.log('📜 Querying bills from Congress...');
    const bills = await fetchPrioritizedBills(userPreferences.policyAreas, user.id);
    console.log(`   Found ${bills.length} relevant bills`);

    // Step 4: Generate dialogue script
    console.log('✍️  Generating dialogue script with Claude AI...');
    const dialogueScript = await generateBriefScript(newsArticles, bills, userPreferences.policyAreas);
    console.log(`   Generated ${dialogueScript.length} dialogue lines`);

    // Step 5: Generate audio
    console.log('🎵 Generating audio with ElevenLabs...');
    const audioBuffer = await generateDialogue(dialogueScript);
    const estimatedDuration = estimateAudioDuration(dialogueScript);
    console.log(`   Generated ${Math.round(audioBuffer.length / 1024 / 1024 * 10) / 10}MB audio`);

    // Step 6: Upload to Vultr
    console.log('☁️  Uploading to Vultr CDN...');
    const audioUrl = await uploadPodcast(audioBuffer, {
      userId: user.id,
      type: 'daily',
      duration: estimatedDuration,
      billsCovered: bills.map(b => b.id),
      generatedAt: new Date(),
    });
    console.log(`   Uploaded: ${audioUrl}`);

    // Step 7: Generate written digest
    console.log('📝 Generating written digest...');
    const writtenDigest = await generateWrittenDigest(newsArticles, bills);

    // Extract metadata
    console.log('🎯 Extracting metadata...');
    const metadata = await extractBriefMetadata(newsArticles, bills, writtenDigest);

    // Step 8: Save to database
    console.log('💾 Saving to database...');
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

    await executeQuery(sql, 'users');

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Brief generation complete in ${totalTime}s`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        briefId,
        audioUrl,
        duration: estimatedDuration,
        processingTime: totalTime,
      }),
    };

  } catch (error: any) {
    console.error('❌ Brief generation failed:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
