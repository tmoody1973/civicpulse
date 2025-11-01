#!/usr/bin/env tsx
/**
 * Simple test for summary API
 */

async function test() {
  console.log('🧪 Testing summary API with Congress.gov fetch...\n');

  try {
    const response = await fetch('http://localhost:3000/api/bills/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billId: '119-hr-5824',
        billNumber: 'HR 5824',
        title: 'Test Bill',
      }),
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

test();
