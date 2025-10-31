#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function testMinimalInsert() {
  console.log('Testing minimal insert (only required fields)...\n');
  
  const billId = '119-hr-99998';
  
  // Try with just the required (NOT NULL) fields
  console.log('1. Inserting with minimal fields...');
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `
        INSERT INTO bills (id, congress, bill_type, bill_number, title)
        VALUES (?, ?, ?, ?, ?)
      `,
      params: [billId, 119, 'hr', 99998, 'Minimal Test Bill']
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Insert failed: ${response.status}`);
    console.error('Error:', errorText);
    return;
  }
  
  console.log('✅ Minimal insert successful!');
  
  // Now try adding more fields one by one
  console.log('\n2. Testing with 10 parameters...');
  const billId2 = '119-hr-99997';
  const response2 = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `
        INSERT INTO bills (
          id, congress, bill_type, bill_number, title,
          summary, sponsor_name, sponsor_party, sponsor_state, introduced_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        billId2, 119, 'hr', 99997, 'Test with 10 params',
        'Test summary', 'Test Sponsor', 'D', 'CA', '2025-01-01'
      ]
    })
  });
  
  if (!response2.ok) {
    const errorText2 = await response2.text();
    console.error(`❌ 10-param insert failed: ${response2.status}`);
    console.error('Error:', errorText2);
  } else {
    console.log('✅ 10-param insert successful!');
  }
  
  // Cleanup
  console.log('\n3. Cleaning up...');
  await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'DELETE FROM bills WHERE id IN (?, ?)',
      params: [billId, billId2]
    })
  });
  console.log('✅ Cleanup complete!');
}

testMinimalInsert().catch(console.error);
