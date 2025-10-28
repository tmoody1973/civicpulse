#!/usr/bin/env tsx
/**
 * Database Migration Runner
 * Safely applies SQL migrations to the Raindrop SmartSQL database
 */

import { env } from '@raindrop-lm/raindrop';
import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(process.cwd(), 'lib/db/migrations');

/**
 * Check if a column exists in a table
 */
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await env.SMARTSQL.run(
      `PRAGMA table_info(${tableName})`
    );

    if (!result || !result.results) {
      return false;
    }

    const columns = JSON.parse(result.results);
    return columns.some((col: any) => col.name === columnName);
  } catch (error) {
    console.error(`Error checking column ${columnName}:`, error);
    return false;
  }
}

/**
 * Check if an index exists
 */
async function indexExists(indexName: string): Promise<boolean> {
  try {
    const result = await env.SMARTSQL.run(
      `SELECT name FROM sqlite_master WHERE type='index' AND name=?`,
      [indexName]
    );

    if (!result || !result.results) {
      return false;
    }

    const indices = JSON.parse(result.results);
    return indices.length > 0;
  } catch (error) {
    console.error(`Error checking index ${indexName}:`, error);
    return false;
  }
}

/**
 * Run a single SQL statement safely
 */
async function runStatement(sql: string): Promise<void> {
  try {
    await env.SMARTSQL.run(sql);
    console.log(`✅ ${sql.substring(0, 50)}...`);
  } catch (error: any) {
    // Ignore "duplicate column" errors (migration already applied)
    if (error.message?.includes('duplicate column name')) {
      console.log(`⏭️  Column already exists, skipping`);
      return;
    }

    // Ignore "index already exists" errors
    if (error.message?.includes('already exists')) {
      console.log(`⏭️  Index already exists, skipping`);
      return;
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Run migration 001: Add search columns
 */
async function runMigration001() {
  console.log('\n📦 Running Migration 001: Add search columns');

  const columns = [
    { name: 'smartbucket_key', type: 'TEXT' },
    { name: 'synced_to_smartbucket_at', type: 'DATETIME' },
    { name: 'searchable_text', type: 'TEXT' },
    { name: 'plain_english_summary', type: 'TEXT' },
    { name: 'tracking_count', type: 'INTEGER DEFAULT 0' },
  ];

  // Add columns if they don't exist
  for (const col of columns) {
    const exists = await columnExists('bills', col.name);
    if (!exists) {
      await runStatement(`ALTER TABLE bills ADD COLUMN ${col.name} ${col.type}`);
    } else {
      console.log(`⏭️  Column ${col.name} already exists`);
    }
  }

  // Create indices
  const indices = [
    'idx_bills_searchable_text',
    'idx_bills_smartbucket_sync',
    'idx_bills_tracking_count'
  ];

  const indexSQL = [
    'CREATE INDEX IF NOT EXISTS idx_bills_searchable_text ON bills(searchable_text)',
    'CREATE INDEX IF NOT EXISTS idx_bills_smartbucket_sync ON bills(synced_to_smartbucket_at)',
    'CREATE INDEX IF NOT EXISTS idx_bills_tracking_count ON bills(tracking_count DESC, latest_action_date DESC)'
  ];

  for (let i = 0; i < indices.length; i++) {
    const exists = await indexExists(indices[i]);
    if (!exists) {
      await runStatement(indexSQL[i]);
    } else {
      console.log(`⏭️  Index ${indices[i]} already exists`);
    }
  }

  console.log('✅ Migration 001 complete!');
}

/**
 * Main migration runner
 */
async function main() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Run migration 001
    await runMigration001();

    console.log('\n✨ All migrations completed successfully!');
    console.log('\n📊 Updated schema:');
    console.log('   - smartbucket_key: TEXT');
    console.log('   - synced_to_smartbucket_at: DATETIME');
    console.log('   - searchable_text: TEXT');
    console.log('   - plain_english_summary: TEXT');
    console.log('   - tracking_count: INTEGER');
    console.log('\n🔍 New indices:');
    console.log('   - idx_bills_searchable_text');
    console.log('   - idx_bills_smartbucket_sync');
    console.log('   - idx_bills_tracking_count');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
