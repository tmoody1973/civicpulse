import { inngest } from '../client';

/**
 * Inngest Cron Function: Daily Brief Scheduler
 *
 * Runs every day at 6:00 AM UTC
 * Fetches all active users and triggers brief generation for each
 */
export const dailyBriefCron = inngest.createFunction(
  {
    id: 'daily-brief-cron',
    name: 'Daily Brief Scheduler'
  },
  { cron: '0 6 * * *' }, // Every day at 6:00 AM UTC
  async ({ step }) => {
    // Step 1: Fetch all users from Raindrop SQL (civic-db)
    const users = await step.run('fetch-users', async () => {
      console.log(`📅 Daily Brief Scheduler: Fetching all users...`);

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

      console.log(`🔍 Executing Raindrop SQL query on users table (civic-db)`);

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
        throw new Error(`Raindrop SQL error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Found ${result.rows?.length || 0} users`);
      return result.rows || [];
    });

    // Step 2: Send brief generation events for each user (fan-out pattern)
    await step.run('trigger-briefs', async () => {
      console.log(`📤 Triggering brief generation for ${users.length} users...`);

      const events = users.map((user: any) => {
        let policyInterests: string[] = [];
        try {
          policyInterests = JSON.parse(user.interests || '[]');
        } catch {
          policyInterests = [];
        }

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

      console.log(`✅ Triggered ${events.length} brief generation jobs`);
      return { count: events.length };
    });

    console.log(`\n✅ Daily brief scheduler completed!`);
    console.log(`   Triggered briefs for ${users.length} users`);

    return {
      usersProcessed: users.length,
      timestamp: new Date().toISOString(),
    };
  }
);
