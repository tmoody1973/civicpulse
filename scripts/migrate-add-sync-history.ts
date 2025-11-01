#!/usr/bin/env tsx
/**
 * Add sync_history table to track automated bill sync runs
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function runMigration() {
  console.log('\n📋 Creating sync_history Table\n');
  console.log('='.repeat(60));

  if (!RAINDROP_SERVICE_URL) {
    console.error('❌ RAINDROP_SERVICE_URL not set');
    process.exit(1);
  }

  try {
    console.log('\n📝 Creating sync_history table...');

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'sync_history',
        query: `
          CREATE TABLE IF NOT EXISTS sync_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sync_type TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at TIMESTAMP NOT NULL,
            completed_at TIMESTAMP,
            run_id TEXT,
            run_url TEXT,
            error_message TEXT,
            bills_fetched INTEGER,
            bills_processed INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      })
    });

    if (response.ok) {
      console.log('✅ Created sync_history table');
    } else {
      const error = await response.text();
      if (error.includes('already exists')) {
        console.log('⚠️  sync_history table already exists (skipping)');
      } else {
        console.error('❌ Failed to create table:', error.substring(0, 100));
      }
    }
  } catch (error: any) {
    console.error('❌ Error creating table:', error.message);
  }

  // Create indexes
  const indexes = [
    { name: 'idx_sync_history_status', sql: 'CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status)' },
    { name: 'idx_sync_history_started_at', sql: 'CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at DESC)' },
    { name: 'idx_sync_history_type', sql: 'CREATE INDEX IF NOT EXISTS idx_sync_history_type ON sync_history(sync_type)' }
  ];

  for (const index of indexes) {
    try {
      console.log(`\n📝 Creating index: ${index.name}...`);

      const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'sync_history',
          query: index.sql
        })
      });

      if (response.ok) {
        console.log(`✅ Created index ${index.name}`);
      } else {
        const error = await response.text();
        console.error(`❌ Failed to create index ${index.name}:`, error.substring(0, 100));
      }
    } catch (error: any) {
      console.error(`❌ Error creating index ${index.name}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration complete!\n');

  // Verify schema
  console.log('📋 Verifying schema...\n');

  try {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'sync_history',
        query: 'PRAGMA table_info(sync_history)'
      })
    });

    const data = await response.json();

    if (data.rows) {
      console.log('Columns in sync_history table:');
      data.rows.forEach((col: any) => {
        console.log(`  ${col.name} (${col.type})`);
      });
    }
  } catch (error: any) {
    console.error('❌ Error verifying schema:', error.message);
  }

  console.log('\n✅ Done!\n');
}

runMigration();
