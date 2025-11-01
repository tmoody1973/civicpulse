#!/usr/bin/env tsx
/**
 * Test search filters to ensure they work correctly
 * Specifically tests that status="passed" only returns passed bills
 */

async function testSearchFilters() {
  console.log('🧪 Testing search filters...\n');

  // Test 1: Search without filters (baseline)
  console.log('1️⃣  Testing search WITHOUT filters:');
  console.log('   Query: "healthcare"');

  try {
    const response1 = await fetch('http://localhost:3000/api/search?q=healthcare&limit=10');
    const data1 = await response1.json();

    console.log(`   ✅ Found ${data1.results.length} results`);
    console.log(`   Statuses: ${[...new Set(data1.results.map((r: any) => r.status))].join(', ')}\n`);
  } catch (error: any) {
    console.error('   ❌ Error:', error.message);
  }

  // Test 2: Search with status=passed filter
  console.log('2️⃣  Testing search WITH status=passed filter:');
  console.log('   Query: "healthcare&status=passed"');

  try {
    const response2 = await fetch('http://localhost:3000/api/search?q=healthcare&status=passed&limit=10');
    const data2 = await response2.json();

    console.log(`   ✅ Found ${data2.results.length} results`);

    // Verify all results have status="passed"
    const statuses = data2.results.map((r: any) => r.status);
    const uniqueStatuses = [...new Set(statuses)];

    console.log(`   Statuses: ${uniqueStatuses.join(', ')}`);

    const allPassed = statuses.every((s: string) => s?.toLowerCase() === 'passed');
    if (allPassed) {
      console.log('   ✅ SUCCESS: All results have status="passed"');
    } else {
      console.log('   ❌ FAILURE: Found bills with other statuses:', uniqueStatuses);
    }

    console.log(`   Meta: ${JSON.stringify(data2.meta, null, 2)}\n`);
  } catch (error: any) {
    console.error('   ❌ Error:', error.message);
  }

  // Test 3: Search with billType=hr filter
  console.log('3️⃣  Testing search WITH billType=hr filter:');
  console.log('   Query: "healthcare&billType=hr"');

  try {
    const response3 = await fetch('http://localhost:3000/api/search?q=healthcare&billType=hr&limit=10');
    const data3 = await response3.json();

    console.log(`   ✅ Found ${data3.results.length} results`);

    const billTypes = data3.results.map((r: any) => r.bill_type);
    const uniqueTypes = [...new Set(billTypes)];

    console.log(`   Bill types: ${uniqueTypes.join(', ')}`);

    const allHR = billTypes.every((t: string) => t?.toLowerCase() === 'hr');
    if (allHR) {
      console.log('   ✅ SUCCESS: All results are House bills (hr)');
    } else {
      console.log('   ❌ FAILURE: Found other bill types:', uniqueTypes);
    }

    console.log(`   Meta: ${JSON.stringify(data3.meta, null, 2)}\n`);
  } catch (error: any) {
    console.error('   ❌ Error:', error.message);
  }

  // Test 4: Multiple filters combined
  console.log('4️⃣  Testing MULTIPLE filters (status=passed&billType=hr):');
  console.log('   Query: "healthcare&status=passed&billType=hr"');

  try {
    const response4 = await fetch('http://localhost:3000/api/search?q=healthcare&status=passed&billType=hr&limit=10');
    const data4 = await response4.json();

    console.log(`   ✅ Found ${data4.results.length} results`);

    const statuses = data4.results.map((r: any) => r.status);
    const billTypes = data4.results.map((r: any) => r.bill_type);

    console.log(`   Statuses: ${[...new Set(statuses)].join(', ')}`);
    console.log(`   Bill types: ${[...new Set(billTypes)].join(', ')}`);

    const allValid = statuses.every((s: string) => s?.toLowerCase() === 'passed') &&
                     billTypes.every((t: string) => t?.toLowerCase() === 'hr');

    if (allValid) {
      console.log('   ✅ SUCCESS: All results match both filters');
    } else {
      console.log('   ❌ FAILURE: Some results don\'t match filters');
    }

    console.log(`   Meta: ${JSON.stringify(data4.meta, null, 2)}\n`);
  } catch (error: any) {
    console.error('   ❌ Error:', error.message);
  }

  console.log('✅ Filter tests completed!');
}

testSearchFilters();
