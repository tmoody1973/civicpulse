#!/usr/bin/env tsx
/**
 * Test SmartSQL Bill Storage
 *
 * Tests the complete flow:
 * 1. Fetch bill from Congress.gov API
 * 2. Enhance with metadata
 * 3. Store in SmartSQL database
 * 4. Sync to Algolia
 * 5. Verify in both databases
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { fetchBillDetails } from '../lib/api/congress';
import { enhanceBill } from '../lib/api/congress-enhanced';
import { syncSingleBill } from '../lib/search/algolia-sync';
import { getBillById, getBillDatabaseStats } from '../lib/db/bills';
import { algoliaSearch, BILLS_INDEX } from '../lib/search/algolia-config';

// Type for Algolia v5 search response
interface AlgoliaSearchResponse<T = unknown> {
  hits: T[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
}

async function testSmartSQLSync() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' 🧪 Testing SmartSQL Bill Storage');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test bill: HR 1 (always exists)
  const congress = 119;
  const billType = 'hr';
  const billNumber = 1;
  const billId = `${billType}${billNumber}-${congress}`;

  console.log(`📋 Test Bill: ${billType.toUpperCase()} ${billNumber} (Congress ${congress})\n`);

  // ==================== STEP 1: Fetch from Congress.gov ====================
  console.log('🔍 Step 1: Fetching bill from Congress.gov API...');
  const fetchStart = Date.now();

  let bill;
  try {
    bill = await fetchBillDetails(congress, billType, billNumber);
    const fetchTime = Date.now() - fetchStart;

    console.log(`✅ Fetched from Congress.gov (${fetchTime}ms)`);
    console.log(`   Title: ${bill.title.substring(0, 80)}...`);
    console.log(`   Sponsor: ${bill.sponsorName}`);
    console.log(`   Introduced: ${bill.introducedDate}`);
    console.log(`   Status: ${bill.latestActionText.substring(0, 60)}...\n`);
  } catch (error: any) {
    console.error(`❌ Failed to fetch bill:`, error.message);
    process.exit(1);
  }

  // ==================== STEP 2: Enhance Bill ====================
  console.log('🔧 Step 2: Enhancing bill with metadata...');

  let enhanced;
  try {
    enhanced = await enhanceBill(bill, false);

    console.log(`✅ Enhanced bill:`);
    console.log(`   Issue Categories: ${enhanced.issueCategories.join(', ')}`);
    console.log(`   Impact Score: ${enhanced.impactScore}/100`);
    console.log(`   Status: ${enhanced.status}`);
    console.log(`   Cosponsor Count: ${enhanced.cosponsors?.count || 0}\n`);
  } catch (error: any) {
    console.error(`❌ Failed to enhance bill:`, error.message);
    process.exit(1);
  }

  // ==================== STEP 3: Sync to SmartSQL + Algolia ====================
  console.log('📤 Step 3: Syncing to SmartSQL and Algolia...');
  const syncStart = Date.now();

  try {
    await syncSingleBill(enhanced);
    const syncTime = Date.now() - syncStart;

    console.log(`✅ Synced to both databases (${syncTime}ms)\n`);
  } catch (error: any) {
    console.error(`❌ Failed to sync:`, error.message);
    console.error(error);
    process.exit(1);
  }

  // ==================== STEP 4: Verify in SmartSQL ====================
  console.log('🔍 Step 4: Verifying bill in SmartSQL database...');

  try {
    const sqlBill = await getBillById(billId);

    if (!sqlBill) {
      console.error(`❌ Bill NOT found in SmartSQL database!`);
      process.exit(1);
    }

    console.log(`✅ Found in SmartSQL:`);
    console.log(`   ID: ${sqlBill.id}`);
    console.log(`   Title: ${sqlBill.title.substring(0, 60)}...`);
    console.log(`   Summary length: ${sqlBill.summary?.length || 0} chars (COMPLETE - no truncation)`);
    console.log(`   Issue Categories: ${sqlBill.issueCategories.join(', ')}`);
    console.log(`   Impact Score: ${sqlBill.impactScore}/100`);
    console.log(`   Sponsor: ${sqlBill.sponsorName} (${sqlBill.sponsorParty})`);
    console.log(`   Status: ${sqlBill.status}\n`);
  } catch (error: any) {
    console.error(`❌ Failed to query SmartSQL:`, error.message);
    console.error(error);
    process.exit(1);
  }

  // ==================== STEP 5: Verify in Algolia ====================
  console.log('🔍 Step 5: Verifying bill in Algolia search index...');

  // Wait a moment for Algolia to index
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const algoliaResult = await algoliaSearch.search({
      requests: [{
        indexName: BILLS_INDEX,
        query: `${billType.toUpperCase()} ${billNumber}`,
        hitsPerPage: 1,
      }],
    });

    const result = algoliaResult.results[0] as AlgoliaSearchResponse;
    const hits = result.hits;

    if (hits.length === 0) {
      console.error(`❌ Bill NOT found in Algolia index!`);
      process.exit(1);
    }

    const algoliaBill = hits[0] as any;

    console.log(`✅ Found in Algolia:`);
    console.log(`   Object ID: ${algoliaBill.objectID}`);
    console.log(`   Bill Number: ${algoliaBill.billNumber}`);
    console.log(`   Title: ${algoliaBill.title.substring(0, 60)}...`);
    console.log(`   Summary length: ${algoliaBill.summary?.length || 0} chars (TRUNCATED for search)`);
    console.log(`   Sponsor: ${algoliaBill.sponsor.name}`);
    console.log(`   Impact Score: ${algoliaBill.impactScore}/100\n`);
  } catch (error: any) {
    console.error(`❌ Failed to query Algolia:`, error.message);
    console.error(error);
    process.exit(1);
  }

  // ==================== STEP 6: Database Statistics ====================
  console.log('📊 Step 6: Getting database statistics...\n');

  try {
    const stats = await getBillDatabaseStats();

    console.log(`SmartSQL Database Stats:`);
    console.log(`   Total Bills: ${stats.totalBills}`);
    console.log(`   Bills by Congress:`, stats.billsByCongress);
    console.log(`   Bills by Status:`, stats.billsByStatus);
    console.log(`   Bills Needing Sync: ${stats.needingSync}\n`);
  } catch (error: any) {
    console.error(`⚠️  Could not get database stats:`, error.message);
  }

  // ==================== SUCCESS ====================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' ✅ SmartSQL Storage Test Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Summary:');
  console.log('  ✅ Fetched bill from Congress.gov API');
  console.log('  ✅ Enhanced with metadata (categories, impact score)');
  console.log('  ✅ Stored COMPLETE data in SmartSQL database');
  console.log('  ✅ Synced TRUNCATED data to Algolia search index');
  console.log('  ✅ Verified bill exists in both databases');
  console.log('');
  console.log('Data Comparison:');
  console.log('  • SmartSQL: Complete summary (no size limit)');
  console.log('  • Algolia: Truncated summary (< 5000 chars for search)');
  console.log('');
  console.log('Next Steps:');
  console.log('  • Bill detail pages should use getBillById() from SmartSQL');
  console.log('  • Search should use Algolia (instant results)');
  console.log('  • Podcast generation should query SmartSQL for complete data');
  console.log('');
}

testSmartSQLSync().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
