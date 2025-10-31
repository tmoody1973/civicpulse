#!/usr/bin/env tsx
/**
 * Test Connections Script
 *
 * Verifies that all required APIs are accessible before starting migration
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testConnections() {
  console.log('🔍 Testing API connections...\n');

  let allPassed = true;

  // 1. Test Congress.gov API
  console.log('1️⃣  Testing Congress.gov API...');
  const congressKey = process.env.CONGRESS_API_KEY;

  if (!congressKey) {
    console.error('   ❌ CONGRESS_API_KEY not set in .env.local');
    allPassed = false;
  } else {
    try {
      const response = await fetch(
        `https://api.congress.gov/v3/bill/119?api_key=${congressKey}&limit=1`
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Congress.gov API working`);
        console.log(`   📊 Sample bill: ${data.bills?.[0]?.number || 'N/A'}`);
      } else {
        console.error(`   ❌ Congress.gov API failed: ${response.status}`);
        allPassed = false;
      }
    } catch (error: any) {
      console.error(`   ❌ Congress.gov API error: ${error.message}`);
      allPassed = false;
    }
  }

  console.log();

  // 2. Test Raindrop SQL
  console.log('2️⃣  Testing Raindrop SQL...');
  const raindropUrl = process.env.RAINDROP_SERVICE_URL;

  if (!raindropUrl) {
    console.error('   ❌ RAINDROP_SERVICE_URL not set in .env.local');
    allPassed = false;
  } else {
    try {
      const response = await fetch(`${raindropUrl}/api/admin/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'bills',
          query: 'SELECT COUNT(*) as count FROM bills'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const count = data.rows?.[0]?.count || 0;
        console.log('   ✅ Raindrop SQL working');
        console.log(`   📊 Current bills in database: ${count}`);
      } else {
        console.error(`   ❌ Raindrop SQL failed: ${response.status}`);
        allPassed = false;
      }
    } catch (error: any) {
      console.error(`   ❌ Raindrop SQL error: ${error.message}`);
      allPassed = false;
    }
  }

  console.log();

  // 3. Test Algolia credentials
  console.log('3️⃣  Testing Algolia credentials...');
  const algoliaAppId = process.env.ALGOLIA_APP_ID;
  const algoliaKey = process.env.ALGOLIA_ADMIN_API_KEY;

  if (!algoliaAppId || !algoliaKey) {
    console.error('   ❌ Algolia credentials not set in .env.local');
    console.error('      Missing: ALGOLIA_APP_ID or ALGOLIA_ADMIN_API_KEY');
    allPassed = false;
  } else {
    console.log('   ✅ Algolia credentials present');
    console.log(`   📊 App ID: ${algoliaAppId}`);
  }

  console.log();

  // 4. Summary
  console.log('='.repeat(60));
  if (allPassed) {
    console.log('🎉 All connections verified! Ready to start migration.');
  } else {
    console.log('❌ Some connections failed. Fix the errors above before proceeding.');
    process.exit(1);
  }
  console.log('='.repeat(60));
}

testConnections().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
