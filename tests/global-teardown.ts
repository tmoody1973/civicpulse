/**
 * Playwright Global Teardown
 * 
 * Runs once after all tests complete across all workers.
 * Cleans up test users created during E2E test runs.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

export default async function globalTeardown() {
  console.log('\n🧹 Running Global Teardown - Cleaning Test Users...\n');

  if (!RAINDROP_SERVICE_URL) {
    console.error('❌ RAINDROP_SERVICE_URL not set, skipping cleanup');
    return;
  }

  try {
    // Count test users
    const countResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'users',
        query: "SELECT COUNT(*) as count FROM users WHERE id LIKE 'test_%'"
      })
    });

    if (!countResponse.ok) {
      console.error('❌ Failed to count test users');
      return;
    }

    const countData = await countResponse.json();
    const testUserCount = countData.rows?.[0]?.count || 0;

    if (testUserCount === 0) {
      console.log('✅ No test users to clean up');
      return;
    }

    console.log(`📊 Found ${testUserCount} test users, deleting...`);

    // Delete test users
    const deleteResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'users',
        query: "DELETE FROM users WHERE id LIKE 'test_%'"
      })
    });

    if (deleteResponse.ok) {
      console.log(`✅ Deleted ${testUserCount} test users`);
    } else {
      const error = await deleteResponse.text();
      console.error('❌ Failed to delete test users:', error.substring(0, 200));
    }

  } catch (error: any) {
    console.error('❌ Error during test cleanup:', error.message);
  }

  console.log('✅ Global teardown complete\n');
}
