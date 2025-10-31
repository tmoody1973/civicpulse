/**
 * Test AI Summary Generation with SmartBuckets data
 *
 * This tests the scenario where a user searches with SmartBuckets
 * and clicks "Generate AI Summary" on a result
 */

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

async function testSummaryWithSmartBucketsData() {
  console.log('🧪 Testing AI Summary with SmartBuckets data...\n');

  // Simulate data from a SmartBuckets search result
  // This is what the BillCard component receives from /api/search
  const smartBucketsResult = {
    id: '119-hr-5824', // Real bill: https://www.congress.gov/bill/119th-congress/house-bill/5824
    billNumber: 'HR 5824',
    title: 'Strengthening Kids Health Over Pills Act of 2025',
    summary: 'Short text chunk from SmartBuckets (only 500 chars)',
    existingSummary: null,
    fullText: null, // NOT provided - API will fetch from Congress.gov
  };

  console.log('📋 SmartBuckets Result:', JSON.stringify(smartBucketsResult, null, 2));
  console.log('\n🔄 Calling /api/bills/summary (WITHOUT full text)...');
  console.log('   API should fetch full text from Congress.gov automatically\n');

  try {
    const response = await fetch('http://localhost:3000/api/bills/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billId: smartBucketsResult.id,
        billNumber: smartBucketsResult.billNumber,
        title: smartBucketsResult.title,
        // NOT providing fullText - API will fetch from Congress.gov
      }),
    });

    const data = await response.json();

    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Data:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ SUCCESS! AI Summary generated:\n');
      console.log(data.summary);
      console.log(`\n⏱️  Generation time: ${data.duration}ms`);
      console.log(`💾 Cached: ${data.cached}`);
    } else {
      console.log('\n❌ FAILED!');
      console.log('Error:', data.error || data.message);
    }
  } catch (error: any) {
    console.error('\n❌ Request failed:', error.message);
  }
}

testSummaryWithSmartBucketsData();
