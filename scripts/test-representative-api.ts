#!/usr/bin/env tsx
/**
 * Test Representative Detail API
 *
 * Tests the API endpoint for fetching representative data
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function testRepresentativeAPI() {
  console.log('\n🧪 Testing Representative Detail API\n');
  console.log('='.repeat(60));

  if (!RAINDROP_SERVICE_URL) {
    console.error('❌ RAINDROP_SERVICE_URL not set');
    process.exit(1);
  }

  // First, get a random representative from the database
  console.log('\n📋 Fetching a representative from database...');

  try {
    const listResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'representatives',
        query: 'SELECT bioguide_id, name, party, chamber, state FROM representatives LIMIT 5'
      })
    });

    const listData = await listResponse.json();
    const representatives = listData.rows || [];

    if (representatives.length === 0) {
      console.error('❌ No representatives found in database');
      process.exit(1);
    }

    console.log(`✅ Found ${representatives.length} representatives:`);
    representatives.forEach((rep: any, index: number) => {
      console.log(
        `   ${index + 1}. ${rep.name} (${rep.party}, ${rep.chamber}, ${rep.state}) - ${rep.bioguide_id}`
      );
    });

    // Test the API endpoint with first representative
    const testRep = representatives[0];
    const bioguideId = testRep.bioguide_id;

    console.log(`\n🧪 Testing API endpoint with ${testRep.name} (${bioguideId})...\n`);

    const apiUrl = `http://localhost:3000/api/representatives/${bioguideId}`;
    console.log(`📡 Calling: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      console.error(`❌ API returned error: ${apiResponse.status}`);
      const errorText = await apiResponse.text();
      console.error('Error:', errorText.substring(0, 200));
      process.exit(1);
    }

    const apiData = await apiResponse.json();

    console.log('\n✅ API Response Received!\n');
    console.log('Representative Data:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(apiData.representative, null, 2));

    console.log('\n\nSponsored Bills Statistics:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(apiData.stats, null, 2));

    console.log(`\n\nTotal Sponsored Bills: ${apiData.sponsoredBills.length}`);

    if (apiData.sponsoredBills.length > 0) {
      console.log('\nFirst 3 Bills:');
      apiData.sponsoredBills.slice(0, 3).forEach((bill: any, index: number) => {
        console.log(
          `\n${index + 1}. ${bill.billType.toUpperCase()} ${bill.billNumber} - ${bill.title.substring(0, 60)}...`
        );
        console.log(`   Status: ${bill.status}`);
        console.log(`   Introduced: ${bill.introducedDate}`);
      });
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('✅ Test Complete!');
    console.log(`\n📍 View page at: http://localhost:3000/representatives/${bioguideId}\n`);

  } catch (error: any) {
    console.error('❌ Error during test:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testRepresentativeAPI();
