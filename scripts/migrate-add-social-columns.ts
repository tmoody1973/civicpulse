#!/usr/bin/env tsx
/**
 * Add Social Media Columns to Representatives Table
 *
 * Adds missing columns for full social media enrichment:
 * - rss_url
 * - facebook_url
 * - youtube_url
 * - instagram_handle
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function runMigration() {
  console.log('\n📋 Adding Social Media Columns to Representatives Table\n');
  console.log('='.repeat(60));

  if (!RAINDROP_SERVICE_URL) {
    console.error('❌ RAINDROP_SERVICE_URL not set');
    process.exit(1);
  }

  const columns = [
    { name: 'rss_url', type: 'TEXT' },
    { name: 'facebook_url', type: 'TEXT' },
    { name: 'youtube_url', type: 'TEXT' },
    { name: 'instagram_handle', type: 'TEXT' }
  ];

  for (const column of columns) {
    try {
      console.log(`\n📝 Adding column: ${column.name} (${column.type})`);

      const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'representatives',
          query: `ALTER TABLE representatives ADD COLUMN ${column.name} ${column.type}`
        })
      });

      if (response.ok) {
        console.log(`✅ Added ${column.name}`);
      } else {
        const error = await response.text();

        // Check if column already exists (not a real error)
        if (error.includes('duplicate column') || error.includes('already exists')) {
          console.log(`⚠️  ${column.name} already exists (skipping)`);
        } else {
          console.error(`❌ Failed to add ${column.name}:`, error.substring(0, 100));
        }
      }
    } catch (error: any) {
      console.error(`❌ Error adding ${column.name}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration complete!\n');

  // Verify schema
  console.log('📋 Verifying updated schema...\n');

  try {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'representatives',
        query: 'PRAGMA table_info(representatives)'
      })
    });

    const data = await response.json();

    if (data.rows) {
      console.log('Columns in representatives table:');
      data.rows.forEach((col: any) => {
        const marker = columns.some(c => c.name === col.name) ? '🆕' : '  ';
        console.log(`${marker} ${col.name} (${col.type})`);
      });
    }
  } catch (error: any) {
    console.error('❌ Error verifying schema:', error.message);
  }

  console.log('\n✅ Done!\n');
}

runMigration();
