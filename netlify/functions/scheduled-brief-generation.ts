/**
 * Netlify Scheduled Function: Nightly Brief Generation
 *
 * Runs every night at midnight UTC (0 0 * * *)
 * Invokes background functions to generate briefs for all active users
 *
 * Configured in netlify.toml:
 * [functions."scheduled-brief-generation"]
 *   schedule = "@daily"
 */

import { schedule, type HandlerEvent, type HandlerContext, type HandlerResponse } from '@netlify/functions';
import { executeQuery } from '../../lib/db/client';

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

    // Step 2: Invoke background function for each user
    console.log('📥 Invoking brief generation for each user...');

    // Invoke background functions (can run for up to 15 minutes)
    const backgroundFunctionUrl = `${process.env.URL}/.netlify/functions/process-brief-job`;

    for (const user of users) {
      try {
        // Invoke background function (fire and forget)
        fetch(backgroundFunctionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            userEmail: user.email || 'unknown',
            forceRegenerate: false,
          }),
        }).catch(err => {
          console.error(`   ❌ Background invocation failed for ${user.email || user.id}:`, err);
        });

        queuedCount++;
        console.log(`   ✅ Invoked brief generation for ${user.email || user.id}`);
      } catch (error: any) {
        failedCount++;
        console.error(`   ❌ Failed to invoke for ${user.email || user.id}:`, error.message);
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

    console.log('\n✅ Nightly generation invoked:');
    console.log(`   Total users: ${summary.totalUsers}`);
    console.log(`   Invoked: ${summary.queuedCount}`);
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
