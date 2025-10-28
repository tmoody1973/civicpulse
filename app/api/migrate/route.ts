/**
 * Database Migration API
 * Run migrations on the SmartSQL database
 *
 * Usage: POST /api/migrate
 */

import { NextResponse } from 'next/server';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

/**
 * Check if a column exists in a table
 */
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: tableName,
        query: `PRAGMA table_info(${tableName})`
      })
    });

    const data = await response.json();
    return data.rows?.some((col: any) => col.name === columnName) || false;
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
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'sqlite_master',
        query: `SELECT name FROM sqlite_master WHERE type='index' AND name='${indexName}'`
      })
    });

    const data = await response.json();
    return data.rows?.length > 0 || false;
  } catch (error) {
    console.error(`Error checking index ${indexName}:`, error);
    return false;
  }
}

/**
 * Run a single SQL statement safely
 */
async function runStatement(sql: string): Promise<string> {
  try {
    // Use admin query endpoint to execute raw SQL
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills', // Required but not actually used for exec statements
        query: sql
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'SQL execution failed');
    }

    return `✅ ${sql.substring(0, 80)}...`;
  } catch (error: any) {
    // Ignore "duplicate column" errors (migration already applied)
    if (error.message?.includes('duplicate column name')) {
      return `⏭️  Column already exists, skipping`;
    }

    // Ignore "index already exists" errors
    if (error.message?.includes('already exists')) {
      return `⏭️  Index already exists, skipping`;
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Run migration 001: Add search columns
 */
async function runMigration001() {
  const logs: string[] = [];
  logs.push('📦 Running Migration 001: Add search columns');

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
      const log = await runStatement(`ALTER TABLE bills ADD COLUMN ${col.name} ${col.type}`);
      logs.push(log);
    } else {
      logs.push(`⏭️  Column ${col.name} already exists`);
    }
  }

  // Create indices
  const indexSQL = [
    'CREATE INDEX IF NOT EXISTS idx_bills_searchable_text ON bills(searchable_text)',
    'CREATE INDEX IF NOT EXISTS idx_bills_smartbucket_sync ON bills(synced_to_smartbucket_at)',
    'CREATE INDEX IF NOT EXISTS idx_bills_tracking_count ON bills(tracking_count DESC, latest_action_date DESC)'
  ];

  const indices = [
    'idx_bills_searchable_text',
    'idx_bills_smartbucket_sync',
    'idx_bills_tracking_count'
  ];

  for (let i = 0; i < indices.length; i++) {
    const exists = await indexExists(indices[i]);
    if (!exists) {
      const log = await runStatement(indexSQL[i]);
      logs.push(log);
    } else {
      logs.push(`⏭️  Index ${indices[i]} already exists`);
    }
  }

  logs.push('✅ Migration 001 complete!');
  return logs;
}

export async function POST() {
  try {
    console.log('🚀 Starting database migrations...');

    // Run migration 001
    const logs = await runMigration001();

    return NextResponse.json({
      success: true,
      message: 'All migrations completed successfully',
      logs,
      schema: {
        newColumns: [
          'smartbucket_key: TEXT',
          'synced_to_smartbucket_at: DATETIME',
          'searchable_text: TEXT',
          'plain_english_summary: TEXT',
          'tracking_count: INTEGER'
        ],
        newIndices: [
          'idx_bills_searchable_text',
          'idx_bills_smartbucket_sync',
          'idx_bills_tracking_count'
        ]
      }
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
