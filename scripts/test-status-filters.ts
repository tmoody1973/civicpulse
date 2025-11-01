#!/usr/bin/env tsx
/**
 * Test Status Filters: Passed and Enacted
 *
 * Tests the search API with status filters to verify filtering works
 */

async function testStatusFilter(status: string, query: string = 'healthcare') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Status Filter: ${status.toUpperCase()}`);
  console.log(`Query: "${query}"`);
  console.log('='.repeat(60));

  try {
    const params = new URLSearchParams({
      q: query,
      status: status,
      limit: '10'
    });

    const response = await fetch(`http://localhost:3000/api/search?${params}`);

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();

    console.log(`\n✅ Search successful!`);
    console.log(`Strategy: ${data.meta.strategy}`);
    console.log(`Total results: ${data.results.length}`);
    console.log(`Processing time: ${data.meta.processingTime}ms\n`);

    if (data.results.length === 0) {
      console.log(`⚠️  No ${status} bills found for query "${query}"`);
    } else {
      console.log(`📋 Sample results (showing first 5):\n`);

      data.results.slice(0, 5).forEach((bill: any, i: number) => {
        console.log(`${i + 1}. ${bill.bill_type.toUpperCase()} ${bill.bill_number}`);
        console.log(`   Title: ${bill.title.substring(0, 80)}...`);
        console.log(`   Status: ${bill.status}`);
        console.log(`   Latest Action: ${bill.latest_action_date || 'N/A'}`);
        console.log();
      });
    }

    return data.results.length;

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return 0;
  }
}

async function main() {
  console.log('\n🧪 Status Filter Test Suite\n');

  // Test 1: Passed bills
  const passedCount = await testStatusFilter('passed', 'healthcare');

  // Test 2: Enacted bills
  const enactedCount = await testStatusFilter('enacted', 'healthcare');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Passed bills found: ${passedCount}`);
  console.log(`Enacted bills found: ${enactedCount}`);
  console.log('='.repeat(60));
  console.log();
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
