/**
 * Netlify Scheduled Function: Nightly Brief Generation
 *
 * Runs every night at midnight UTC (0 0 * * *)
 * Queues brief generation jobs for all active users
 *
 * Configured in netlify.toml:
 * [functions."scheduled-brief-generation"]
 *   schedule = "@daily"
 */

import { schedule, type HandlerEvent, type HandlerContext, type HandlerResponse } from '@netlify/functions';
import { executeQuery } from '../../lib/db/client';
import { addBriefJob } from '../../lib/queue/brief-queue';

// Main handler function
const handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  console.log('🌙 Starting nightly brief generation...');
  console.log('   Time:', new Date().toISOString());

  const startTime = Date.now();
  let queuedCount = 0;
  let failedCount = 0;

  try {
    // Step 1: Get all active users
    console.log('📋 Fetching active users...');

    const result = await executeQuery(
      `SELECT id, email, name
       FROM users
       WHERE onboarding_completed = 1
       ORDER BY created_at DESC`,
      'users'
    );

    const users = result.rows;
    console.log(`   Found ${users.length} active users`);

    // Step 2: Queue a brief generation job for each user
    console.log('📥 Queuing brief generation jobs...');

    for (const user of users) {
      try {
        const jobId = await addBriefJob({
          userId: user.id,
          userEmail: user.email || 'unknown',
          forceRegenerate: false, // Don't regenerate if already exists for today
        });

        queuedCount++;
        console.log(`   ✅ Queued brief for ${user.email || user.id} (job: ${jobId})`);
      } catch (error: any) {
        failedCount++;
        console.error(`   ❌ Failed to queue for ${user.email || user.id}:`, error.message);
      }
    }

    // Step 3: Return summary
    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      totalUsers: users.length,
      queuedCount,
      failedCount,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    };

    console.log('\n✅ Nightly generation complete:');
    console.log(`   Total users: ${summary.totalUsers}`);
    console.log(`   Queued: ${summary.queuedCount}`);
    console.log(`   Failed: ${summary.failedCount}`);
    console.log(`   Duration: ${duration}ms`);

    return {
      statusCode: 200,
      body: JSON.stringify(summary, null, 2),
    };

  } catch (error: any) {
    console.error('❌ Scheduled function error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        queuedCount,
        failedCount,
        timestamp: new Date().toISOString(),
      }, null, 2),
    };
  }
};

// Schedule: Every day at midnight UTC (0 0 * * *)
// Netlify's @daily runs at midnight UTC
export const scheduledBriefGeneration = schedule('@daily', handler);

// Export default for manual testing via Netlify CLI
export { handler as default };
