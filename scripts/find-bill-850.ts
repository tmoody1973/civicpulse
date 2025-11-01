#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function findBill() {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: "SELECT id, congress, bill_type, bill_number, title FROM bills WHERE congress = 119 AND bill_type = 'hres' AND bill_number = 850"
    })
  });

  const data = await response.json();
  console.log('Query result:', JSON.stringify(data, null, 2));

  // Also try searching by ID pattern
  const response2 = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: "SELECT id, congress, bill_type, bill_number, title FROM bills WHERE id LIKE '%850%'"
    })
  });

  const data2 = await response2.json();
  console.log('\nBills with 850 in ID:', JSON.stringify(data2, null, 2));
}

findBill();
