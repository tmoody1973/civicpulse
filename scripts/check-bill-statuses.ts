#!/usr/bin/env tsx
/**
 * Check Bill Statuses in Database
 *
 * Queries the database to see what status values actually exist
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function checkStatuses() {
  console.log('\n📊 Checking Bill Status Values in Database\n');
  console.log('='.repeat(60));

  try {
    // Query to get all unique status values
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: 'SELECT DISTINCT status, COUNT(*) as count FROM bills GROUP BY status ORDER BY count DESC'
      })
    });

    const data = await response.json();

    if (data.rows && data.rows.length > 0) {
      console.log('\n✅ Status values found in database:\n');

      let total = 0;
      data.rows.forEach((row: any) => {
        console.log(`  ${row.status || '(null)'}: ${row.count} bills`);
        total += row.count;
      });

      console.log('\n' + '-'.repeat(60));
      console.log(`  Total: ${total} bills`);
      console.log('='.repeat(60));

      // Check for passed/enacted specifically
      const passedRow = data.rows.find((r: any) => r.status?.toLowerCase() === 'passed');
      const enactedRow = data.rows.find((r: any) => r.status?.toLowerCase() === 'enacted');

      console.log('\n🔍 Filter Status Check:');
      console.log(`  "passed": ${passedRow ? `✅ ${passedRow.count} bills` : '❌ Not found'}`);
      console.log(`  "enacted": ${enactedRow ? `✅ ${enactedRow.count} bills` : '❌ Not found'}`);

    } else {
      console.log('⚠️  No status data found');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');
}

checkStatuses();
