#!/usr/bin/env node
/**
 * Queue a test brief generation for a specific user
 * Usage: npx tsx scripts/queue-test-brief.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { addBriefJob } from '../lib/queue/brief-queue';

async function queueTestBrief() {
  const userId = 'user_01K8NC5EJ3JBZKC9EQRQBQQVK4';
  const userEmail = 'test@example.com';

  console.log(`📥 Queuing brief generation for user: ${userId}`);

  try {
    const jobId = await addBriefJob({
      userId,
      userEmail,
      forceRegenerate: true,
    });

    console.log(`✅ Job queued successfully!`);
    console.log(`   Job ID: ${jobId}`);
    console.log(`   User: ${userId}`);
    console.log('\n🔄 The worker will process this job automatically.');
    console.log('   Make sure the brief worker is running (npm run worker:briefs)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to queue job:', error);
    process.exit(1);
  }
}

queueTestBrief();
