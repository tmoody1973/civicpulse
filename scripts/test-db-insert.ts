#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function testInsert() {
  console.log('Testing database insert...\n');
  
  // First, check current schema
  console.log('1. Checking table schema...');
  const schemaResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'PRAGMA table_info(bills)'
    })
  });
  
  if (!schemaResponse.ok) {
    console.error(`Schema query failed: ${schemaResponse.status}`);
    const text = await schemaResponse.text();
    console.error('Response:', text);
    return;
  }
  
  const schemaData = await schemaResponse.json();
  console.log('Table columns:', schemaData.rows);
  console.log();
  
  // Now test a simple insert
  console.log('2. Testing simple insert...');
  const testBill = {
    id: '119-hr-99999',
    congress: 119,
    bill_type: 'hr',
    bill_number: 99999,
    title: 'Test Bill',
    summary: 'Test summary',
    sponsor_name: 'Test Sponsor',
    sponsor_party: 'D',
    sponsor_state: 'CA',
    sponsor_district: '1',
    introduced_date: '2025-01-01',
    latest_action_date: '2025-01-02',
    latest_action_text: 'Test action',
    status: 'introduced',
    policy_area: 'Test',
    issue_categories: JSON.stringify(['test']),
    full_text: 'Test full text',
    cosponsor_count: 0,
    committees: JSON.stringify(['Test Committee']),
    impact_score: 50
  };
  
  const insertResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
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
        testBill.id,
        testBill.congress,
        testBill.bill_type,
        testBill.bill_number,
        testBill.title,
        testBill.summary,
        testBill.sponsor_name,
        testBill.sponsor_party,
        testBill.sponsor_state,
        testBill.sponsor_district,
        testBill.introduced_date,
        testBill.latest_action_date,
        testBill.latest_action_text,
        testBill.status,
        testBill.policy_area,
        testBill.issue_categories,
        testBill.full_text,
        testBill.cosponsor_count,
        testBill.committees,
        testBill.impact_score
      ]
    })
  });
  
  if (!insertResponse.ok) {
    console.error(`Insert failed: ${insertResponse.status}`);
    const text = await insertResponse.text();
    console.error('Response:', text);
    return;
  }
  
  console.log('✅ Insert successful!');
  
  // Clean up
  console.log('\n3. Cleaning up test data...');
  const deleteResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'DELETE FROM bills WHERE id = ?',
      params: [testBill.id]
    })
  });
  
  if (deleteResponse.ok) {
    console.log('✅ Cleanup successful!');
  }
}

testInsert().catch(console.error);
