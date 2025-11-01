#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function checkPolicyAreas() {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'SELECT id, title, policy_area FROM bills WHERE policy_area IS NOT NULL LIMIT 10'
    })
  });

  const data = await response.json();
  console.log(`Found ${data.rows?.length || 0} bills with policy areas\n`);

  data.rows?.slice(0, 5).forEach((bill: any) => {
    console.log(`- ${bill.policy_area}: ${bill.title.substring(0, 60)}...`);
  });
}

checkPolicyAreas();
