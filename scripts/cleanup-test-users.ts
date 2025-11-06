#!/usr/bin/env tsx
/**
 * Clean up test users from the database
 * Removes all users with IDs starting with 'test_'
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function cleanupTestUsers() {
  console.log('\n🧹 Cleaning Up Test Users\n');
  console.log('='.repeat(60));

  if (!RAINDROP_SERVICE_URL) {
    console.error('❌ RAINDROP_SERVICE_URL not set');
    process.exit(1);
  }

  try {
    // Count test users
    console.log('\n📊 Counting test users...');
    const countResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'users',
        query: "SELECT COUNT(*) as count FROM users WHERE id LIKE 'test_%'"
      })
    });

    const countData = await countResponse.json();
    const testUserCount = countData.rows?.[0]?.count || 0;
    console.log(`Found ${testUserCount} test users`);

    if (testUserCount === 0) {
      console.log('✅ No test users to clean up');
      return;
    }

    // Delete test users
    console.log('\n🗑️  Deleting test users...');
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
      console.error('❌ Failed to delete test users:', error);
    }

    // Verify deletion
    console.log('\n✔️  Verifying deletion...');
    const verifyResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'users',
        query: "SELECT COUNT(*) as count FROM users WHERE id LIKE 'test_%'"
      })
    });

    const verifyData = await verifyResponse.json();
    const remainingCount = verifyData.rows?.[0]?.count || 0;

    if (remainingCount === 0) {
      console.log('✅ All test users deleted successfully');
    } else {
      console.warn(`⚠️  ${remainingCount} test users still remain`);
    }

  } catch (error: any) {
    console.error('❌ Error cleaning up test users:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Cleanup complete!\n');
}

cleanupTestUsers();
