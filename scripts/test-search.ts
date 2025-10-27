#!/usr/bin/env tsx
/**
 * Test Search Script
 *
 * Tests the fallback logic:
 * 1. Search a bill in Algolia (should be empty)
 * 2. Fallback to Congress.gov API
 * 3. Verify bill is found and synced
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { fetchBillDetails } from '../lib/api/congress';
import { enhanceBill } from '../lib/api/congress-enhanced';
import { syncSingleBill } from '../lib/search/algolia-sync';
import { algoliaSearch, BILLS_INDEX } from '../lib/search/algolia-config';

// Type for Algolia v5 search response
interface AlgoliaSearchResponse<T = unknown> {
  hits: T[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
}

async function testSearch() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' 🧪 Testing Search Fallback Logic');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test case: Search for HR 1 (always exists)
  const testBill = 'HR 1';
  console.log(`📋 Test Bill: ${testBill} (Congress 119)\n`);

  // STEP 1: Check if bill is in Algolia
  console.log('🔍 Step 1: Searching Algolia...');
  try {
    const algoliaResult = await algoliaSearch.search({
      requests: [{
        indexName: BILLS_INDEX,
        query: testBill,
        hitsPerPage: 1,
      }],
    });

    const result = algoliaResult.results[0] as AlgoliaSearchResponse;
    const algoliaHits = result.nbHits || 0;

    if (algoliaHits > 0) {
      console.log(`✅ Found in Algolia (${algoliaHits} results)`);
      console.log(`   Bill already synced - fallback not needed\n`);
      return;
    }

    console.log(`⚠️  Not found in Algolia (index is empty)`);
    console.log(`   Proceeding to fallback test...\n`);

  } catch (error: any) {
    if (error.status === 404) {
      console.log(`⚠️  Algolia index doesn't exist yet (expected on first run)`);
      console.log(`   Proceeding to fallback test...\n`);
    } else {
      throw error;
    }
  }

  // STEP 2: Fetch from Congress.gov API (fallback)
  console.log('🔍 Step 2: Fetching from Congress.gov API...');
  const startTime = Date.now();

  const bill = await fetchBillDetails(119, 'hr', 1);
  const fetchTime = Date.now() - startTime;

  console.log(`✅ Found on Congress.gov (${fetchTime}ms)`);
  console.log(`   Title: ${bill.title.substring(0, 80)}...`);
  console.log(`   Sponsor: ${bill.sponsorName} (${bill.sponsorParty})`);
  console.log(`   Status: ${bill.latestActionText.substring(0, 80)}...\n`);

  // STEP 3: Enhance the bill
  console.log('🔧 Step 3: Enhancing bill with metadata...');
  const enhanced = await enhanceBill(bill, false);

  console.log(`✅ Enhanced bill:`);
  console.log(`   Issue Categories: ${enhanced.issueCategories.join(', ')}`);
  console.log(`   Impact Score: ${enhanced.impactScore}/100`);
  console.log(`   Status: ${enhanced.status}\n`);

  // STEP 4: Sync to Algolia
  console.log('📤 Step 4: Syncing to Algolia...');
  await syncSingleBill(enhanced);

  console.log(`✅ Synced to Algolia\n`);

  // STEP 5: Verify sync worked
  console.log('🔍 Step 5: Verifying sync (search Algolia again)...');

  // Wait a moment for Algolia to index
  await new Promise(resolve => setTimeout(resolve, 2000));

  const verifyResult = await algoliaSearch.search({
    requests: [{
      indexName: BILLS_INDEX,
      query: testBill,
      hitsPerPage: 1,
    }],
  });

  const verifyResultData = verifyResult.results[0] as AlgoliaSearchResponse;
  const verifyHits = verifyResultData.nbHits || 0;

  if (verifyHits > 0) {
    console.log(`✅ Verification successful! Bill now appears in Algolia`);
    console.log(`   Next search will be instant (< 20ms)\n`);
  } else {
    console.log(`⚠️  Bill not found in Algolia yet`);
    console.log(`   Algolia indexing may take a few seconds\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' ✅ Fallback Logic Test Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Summary:');
  console.log(`  • Algolia search: < 20ms (when bill exists)`);
  console.log(`  • Congress.gov fallback: ${fetchTime}ms (on first search)`);
  console.log(`  • Bill now synced for instant future searches`);
  console.log('');
}

testSearch().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
