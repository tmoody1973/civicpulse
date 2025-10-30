#!/usr/bin/env tsx
/**
 * Check Representatives in Database
 *
 * Queries the database to see what representatives already exist
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function checkRepresentatives() {
  console.log('\n👥 Checking Representatives in Database\n');
  console.log('='.repeat(60));

  try {
    // Query to get count and sample
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'representatives',
        query: 'SELECT * FROM representatives ORDER BY name LIMIT 10'
      })
    });

    const data = await response.json();

    if (data.rows && data.rows.length > 0) {
      console.log(`\n✅ Found ${data.rows.length} representatives (showing first 10):\n`);

      data.rows.forEach((rep: any) => {
        const party = rep.party || '?';
        const state = rep.state || '?';
        const district = rep.district ? `-${rep.district}` : '';
        const chamber = rep.chamber || '?';

        console.log(`  ${rep.name} [${party}-${state}${district}] (${chamber})`);
      });

      // Get total count
      const countResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'representatives',
          query: 'SELECT COUNT(*) as total FROM representatives'
        })
      });

      const countData = await countResponse.json();
      const total = countData.rows?.[0]?.total || 0;

      console.log('\n' + '-'.repeat(60));
      console.log(`  Total Representatives: ${total}`);
      console.log('='.repeat(60));

      // Show schema
      console.log('\n📋 Table Schema:');
      const schemaResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'representatives',
          query: 'PRAGMA table_info(representatives)'
        })
      });

      const schemaData = await schemaResponse.json();
      if (schemaData.rows) {
        console.log('\nColumns:');
        schemaData.rows.forEach((col: any) => {
          console.log(`  - ${col.name} (${col.type})`);
        });
      }

    } else {
      console.log('⚠️  No representatives found in database');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');
}

checkRepresentatives();
