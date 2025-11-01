#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function testSingleInsert() {
  console.log('Testing single bill insert with new approach...\n');
  
  const billId = '119-hr-99999';
  
  // Delete if exists
  console.log('1. Deleting existing record (if any)...');
  await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'DELETE FROM bills WHERE id = ?',
      params: [billId]
    })
  });
  
  // Insert new
  console.log('2. Inserting new record...');
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `
        INSERT INTO bills (
          id, congress, bill_type, bill_number, title, summary,
          sponsor_name, sponsor_party, sponsor_state, sponsor_district,
          introduced_date, latest_action_date, latest_action_text,
          status, policy_area, issue_categories, full_text,
          cosponsor_count, committees, impact_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        billId,
        119,
        'hr',
        99999,
        'Test Bill Title',
        'Test summary',
        'Test Sponsor',
        'D',
        'CA',
        '1',
        '2025-01-01',
        '2025-01-02',
        'Referred to committee',
        'introduced',
        'Test Policy',
        JSON.stringify(['test', 'categories']),
        'Test full text content',
        5,
        JSON.stringify(['House Committee on Test']),
        50
      ]
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Insert failed: ${response.status}`);
    console.error('Error:', errorText);
    return false;
  }
  
  console.log('✅ Insert successful!');
  
  // Verify
  console.log('3. Verifying insert...');
  const verifyResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'SELECT * FROM bills WHERE id = ?',
      params: [billId]
    })
  });
  
  if (verifyResponse.ok) {
    const data = await verifyResponse.json();
    console.log('✅ Record found:', data.rows[0]);
  }
  
  // Cleanup
  console.log('4. Cleaning up...');
  await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'DELETE FROM bills WHERE id = ?',
      params: [billId]
    })
  });
  console.log('✅ Cleanup complete!');
  
  return true;
}

testSingleInsert().catch(console.error);
