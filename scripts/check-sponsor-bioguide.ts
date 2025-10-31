#!/usr/bin/env tsx
/**
 * Check if sponsor_bioguide_id exists in database
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function checkSponsorBioguideId() {
  try {
    console.log('🔍 Checking sponsor_bioguide_id in bills table...\n');

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: `SELECT title, sponsor_name, sponsor_bioguide_id FROM bills WHERE title LIKE '%Climate Change Health%' LIMIT 1`
      })
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('📊 Sample bill:');
    console.log(JSON.stringify(data.rows[0], null, 2));

    // Check how many bills have sponsor_bioguide_id
    const countResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: `SELECT
          COUNT(*) as total,
          COUNT(sponsor_bioguide_id) as with_bioguide_id
        FROM bills`
      })
    });

    const countData = await countResponse.json();
    console.log('\n📈 Stats:');
    console.log(JSON.stringify(countData.rows[0], null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSponsorBioguideId();
