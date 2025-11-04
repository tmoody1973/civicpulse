#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function checkBillCount() {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN policy_area IS NOT NULL THEN 1 END) as with_policy,
          COUNT(CASE WHEN policy_area IS NULL THEN 1 END) as without_policy,
          COUNT(CASE WHEN ai_policy_area IS NOT NULL THEN 1 END) as with_ai_policy,
          congress,
          COUNT(*) as count
        FROM bills
        GROUP BY congress
        ORDER BY congress DESC
      `
    })
  });

  const data = await response.json();

  console.log('\n📊 Bill Statistics\n');
  console.log('='.repeat(60));

  // Get totals
  const totalsResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN policy_area IS NOT NULL THEN 1 END) as with_policy,
          COUNT(CASE WHEN policy_area IS NULL THEN 1 END) as without_policy,
          COUNT(CASE WHEN ai_policy_area IS NOT NULL THEN 1 END) as with_ai_policy
        FROM bills
      `
    })
  });

  const totals = await totalsResponse.json();

  if (totals.rows && totals.rows.length > 0) {
    const stats = totals.rows[0];
    console.log(`Total Bills: ${stats.total}`);
    console.log(`With Official Policy Area: ${stats.with_policy}`);
    console.log(`Without Official Policy Area: ${stats.without_policy}`);
    console.log(`With AI-Inferred Policy Area: ${stats.with_ai_policy}`);
    console.log('='.repeat(60));
  }

  // Breakdown by congress
  console.log('\nBreakdown by Congress:');
  console.log('='.repeat(60));

  if (data.rows && data.rows.length > 0) {
    for (const row of data.rows) {
      console.log(`Congress ${row.congress}: ${row.count} bills`);
    }
  }

  console.log('\n');
}

checkBillCount().catch(console.error);
