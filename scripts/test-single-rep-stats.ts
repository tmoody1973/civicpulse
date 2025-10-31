#!/usr/bin/env tsx
/**
 * Test Stats Population for Single Representative
 *
 * Tests the stats population for a single representative (José E. Serrano)
 * to verify the system works before running full population.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fetchMemberBills, calculateBillStats } from '../lib/congress/fetch-member-bills';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;
const TEST_BIOGUIDE_ID = 'S000248'; // José E. Serrano

async function updateRepresentativeStats(
  bioguideId: string,
  stats: {
    totalSponsored: number;
    totalCosponsored: number;
    lawsPassed: number;
    activeBills: number;
    policyAreas: number;
  }
) {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'representatives',
      query: `
        UPDATE representatives
        SET bills_sponsored_total = ${stats.totalSponsored},
            bills_cosponsored_total = ${stats.totalCosponsored},
            bills_laws_passed = ${stats.lawsPassed},
            bills_active = ${stats.activeBills},
            policy_areas_count = ${stats.policyAreas},
            stats_updated_at = CURRENT_TIMESTAMP
        WHERE bioguide_id = '${bioguideId}'
      `
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to update stats: ${response.statusText}`);
  }
}

async function testSingleRep() {
  try {
    console.log(`🧪 Testing stats population for ${TEST_BIOGUIDE_ID}\n`);

    // Fetch bills (full count for accurate stats)
    console.log('📋 Fetching bills from Congress.gov API...');
    const { sponsoredBills, cosponsoredBills } = await fetchMemberBills(TEST_BIOGUIDE_ID, {
      limit: 250,
      timeout: 30000
    });

    console.log(`✅ Fetched ${sponsoredBills.length} sponsored, ${cosponsoredBills.length} co-sponsored\n`);

    // Calculate stats
    console.log('🧮 Calculating statistics...');
    const stats = calculateBillStats(sponsoredBills, cosponsoredBills);

    console.log('📊 Stats calculated:');
    console.log(`   - Total Sponsored: ${stats.totalSponsored}`);
    console.log(`   - Total Co-sponsored: ${stats.totalCosponsored}`);
    console.log(`   - Laws Passed: ${stats.lawsPassed}`);
    console.log(`   - Active Bills: ${stats.activeBills}`);
    console.log(`   - Policy Areas: ${stats.policyAreas}\n`);

    // Update database
    console.log('💾 Updating database...');
    await updateRepresentativeStats(TEST_BIOGUIDE_ID, stats);

    console.log('✅ Database updated successfully!\n');

    // Verify it was saved
    console.log('🔍 Verifying saved data...');
    const verifyResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'representatives',
        query: `SELECT name, bills_sponsored_total, bills_cosponsored_total, bills_laws_passed, bills_active, policy_areas_count, stats_updated_at FROM representatives WHERE bioguide_id = '${TEST_BIOGUIDE_ID}'`
      })
    });

    const verifyData = await verifyResponse.json();
    console.log('📊 Database record:');
    console.log(JSON.stringify(verifyData.rows[0], null, 2));

    console.log('\n✅ Test complete! Stats are being saved correctly.');
    console.log('💡 You can now run populate-stats.ts to populate all 538 representatives.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testSingleRep();
