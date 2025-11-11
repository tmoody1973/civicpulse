#!/usr/bin/env npx tsx

import { inngest } from './src/inngest/client';

/**
 * Manually trigger daily briefs for all users
 * Simulates the daily cron job
 */
async function triggerDailyBriefs() {
  console.log('🕐 Triggering Daily Briefs for All Users...\n');

  try {
    // Step 1: Fetch all users from database
    console.log('📊 Step 1: Fetching users from database...');
    const raindropServiceUrl = process.env.RAINDROP_SERVICE_URL || 'https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run';

    const query = `
      SELECT
        id,
        email,
        name,
        state,
        district,
        interests
      FROM users
      WHERE interests IS NOT NULL
      AND interests != '[]'
    `;

    const response = await fetch(`${raindropServiceUrl}/api/admin/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table: 'users',
        query,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const users = result.rows || [];

    console.log(`✅ Found ${users.length} users with interests\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found with interests. Nothing to do.');
      return;
    }

    // Step 2: Trigger brief generation for each user
    console.log('📤 Step 2: Triggering brief generation events...');

    const events = users.map((user: any) => {
      let policyInterests: string[] = [];
      try {
        policyInterests = JSON.parse(user.interests || '[]');
      } catch {
        policyInterests = [];
      }

      console.log(`   • ${user.email} (${policyInterests.join(', ')})`);

      return {
        name: 'brief/generate' as const,
        data: {
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          state: user.state,
          district: user.district,
          policyInterests,
        },
      };
    });

    // Send all events in batch
    await inngest.send(events);

    console.log(`\n✅ Successfully triggered ${events.length} brief generation jobs!`);
    console.log('📍 Check Inngest Dev Server: http://localhost:8288');
    console.log('\n⏱️  Each brief takes ~2-3 minutes to generate');
    console.log('🔔 Users will receive briefs with:');
    console.log('   • Creative headlines');
    console.log('   • Featured images');
    console.log('   • Personalized policy news');
    console.log('   • Congressional bill updates');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

triggerDailyBriefs();
