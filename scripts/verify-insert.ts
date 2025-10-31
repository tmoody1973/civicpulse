#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function verifyInsert() {
  console.log('Checking database directly...\n');
  
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'SELECT * FROM bills WHERE id = ?',
      params: ['119-hr-99999']
    })
  });
  
  if (!response.ok) {
    console.error(`❌ Query failed: ${response.status}`);
    return;
  }
  
  const data = await response.json();
  if (data.rows && data.rows.length > 0) {
    console.log('✅ Bill found in database!');
    console.log('Bill data:', JSON.stringify(data.rows[0], null, 2));
  } else {
    console.log('❌ Bill not found');
  }
  
  // Also check total count
  const countResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'SELECT COUNT(*) as count FROM bills'
    })
  });
  
  const countData = await countResponse.json();
  console.log('\nTotal bills in database:', countData.rows[0].count);
}

verifyInsert().catch(console.error);
