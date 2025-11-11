/**
 * Daily Brief Scheduler Task
 *
 * Runs at 9:00 AM UTC every day (0 9 * * * cron)
 * Queries all active users and queues brief generation jobs
 */

import { Task, Event } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

interface User {
  id: string;
  email: string;
  name: string | null;
  state: string | null;
  district: string | null;
  interests: string | null;
}

export default class DailyBriefScheduler extends Task<Env> {
  async handle(event: Event): Promise<void> {
    const startTime = Date.now();
    console.log(`\n🌅 Daily brief scheduler triggered at ${new Date(event.scheduledTime).toISOString()}`);
    console.log(`   Cron expression: ${event.cron}`);

    try {
      // Step 1: Query all active users from database
      console.log('\n📊 Querying active users from database...');

      const query = `
        SELECT id, email, name, state, district, interests
        FROM users
        WHERE email IS NOT NULL
        ORDER BY created_at DESC
      `;

      const result = await this.env.HAKIVO_DB.prepare(query).all();
      const users = result.results as unknown as User[];

      console.log(`   Found ${users.length} users`);

      if (users.length === 0) {
        console.log('   No users to process, exiting');
        return;
      }

      // Step 2: Queue brief generation job for each user
      console.log('\n📮 Queueing brief generation jobs...');

      let queuedCount = 0;
      let failedCount = 0;

      for (const user of users) {
        try {
          // Parse interests (stored as JSON string)
          let policyInterests: string[] = [];
          if (user.interests) {
            try {
              policyInterests = typeof user.interests === 'string'
                ? JSON.parse(user.interests)
                : user.interests;
            } catch (e) {
              console.log(`   ⚠️  Failed to parse interests for ${user.email}`);
              policyInterests = ['Politics', 'Healthcare', 'Education']; // Defaults
            }
          } else {
            policyInterests = ['Politics', 'Healthcare', 'Education']; // Defaults
          }

          // Queue job to brief_queue
          await this.env.BRIEF_QUEUE.send({
            userId: user.id,
            userEmail: user.email || 'unknown',
            userName: user.name,
            state: user.state,
            district: user.district,
            policyInterests,
            forceRegenerate: false,
          }, {
            contentType: 'json',
          });

          queuedCount++;
          console.log(`   ✅ Queued brief for ${user.email || user.id}`);

        } catch (error: any) {
          failedCount++;
          console.error(`   ❌ Failed to queue for ${user.email || user.id}:`, error.message);
        }
      }

      // Step 3: Log summary
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n✅ Daily scheduling completed in ${duration}s`);
      console.log(`   Queued: ${queuedCount}`);
      console.log(`   Failed: ${failedCount}`);
      console.log(`   Total: ${users.length}`);
      console.log(`\n📬 ${queuedCount} brief jobs queued and will be processed by brief_worker`);

    } catch (error: any) {
      console.error('\n❌ Daily scheduler failed:', error);
      throw error; // Task will retry at next scheduled time
    }
  }
}
