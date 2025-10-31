#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function checkBills() {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: "SELECT id, title, policy_area, issue_categories FROM bills WHERE id IN ('119-s-3030', '119-s-1318')"
    })
  });

  const data = await response.json();
  console.log(JSON.stringify(data.rows, null, 2));
}

checkBills();
