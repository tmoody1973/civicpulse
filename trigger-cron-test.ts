#!/usr/bin/env npx tsx

import { inngest } from './src/inngest/client';

/**
 * Manually trigger the daily brief cron job
 * This simulates what happens at midnight every day
 */
async function triggerCron() {
  console.log('🕐 Manually triggering Daily Brief Cron...\n');
  console.log('This will:');
  console.log('  1. Fetch all users with interests from database');
  console.log('  2. Trigger brief generation for each user');
  console.log('  3. Each user gets their personalized daily brief\n');

  try {
    // Trigger the cron by sending a cron event
    // Inngest will execute the dailyBriefCron function
    await inngest.send({
      name: 'inngest/scheduled.timer' as const,
      data: {
        cron: '0 6 * * *',
        function_id: 'daily-brief-cron',
        ts: Date.now()
      }
    });

    console.log('✅ Cron event sent successfully!');
    console.log('📍 Check Inngest Dev Server: http://localhost:8288');
    console.log('\nThe cron will:');
    console.log('  • Fetch users from database');
    console.log('  • Send brief/generate events for each user');
    console.log('  • Each brief generation takes ~2-3 minutes');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

triggerCron();
