#!/usr/bin/env tsx
/**
 * Test Congress.gov API text fetching
 */

import { fetchBillText } from '../lib/api/congress';

async function test() {
  console.log('🧪 Testing Congress.gov API...\n');
  console.log('Fetching bill text for HR 5824 (119th Congress)...\n');

  const start = Date.now();

  try {
    const text = await fetchBillText(119, 'hr', 5824);
    const duration = Date.now() - start;

    if (text) {
      console.log(`✅ Success! Fetched ${text.length} characters in ${duration}ms`);
      console.log('\nFirst 1000 characters:');
      console.log(text.substring(0, 1000));
      console.log('\n...\n');
    } else {
      console.log(`⚠️  No text available (took ${duration}ms)`);
    }
  } catch (error: any) {
    const duration = Date.now() - start;
    console.error(`❌ Error (after ${duration}ms):`, error.message);
    console.error('Stack:', error.stack);
  }
}

test();
