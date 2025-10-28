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
 * Check if a column is nullable
 */
async function isColumnNullable(tableName: string, columnName: string): Promise<boolean> {
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
    const column = data.rows?.find((col: any) => col.name === columnName);
    return column ? column.notnull === 0 : true;
  } catch (error) {
    console.error(`Error checking if column ${columnName} is nullable:`, error);
    return true; // Assume nullable on error
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

/**
 * Run migration 002: Fix NOT NULL constraints on optional fields
 */
async function runMigration002() {
  const logs: string[] = [];
  logs.push('📦 Running Migration 002: Fix NOT NULL constraints');

  // Check if migration is needed
  const introducedDateNullable = await isColumnNullable('bills', 'introduced_date');

  if (introducedDateNullable) {
    logs.push('⏭️  Migration already applied (introduced_date is nullable)');
    return logs;
  }

  logs.push('🔄 Recreating bills table with nullable date fields...');

  // Step 1: Create new table
  await runStatement(`
    CREATE TABLE IF NOT EXISTS bills_new (
      id TEXT PRIMARY KEY,
      congress INTEGER NOT NULL,
      bill_type TEXT NOT NULL,
      bill_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      full_text TEXT,
      sponsor_bioguide_id TEXT,
      sponsor_name TEXT,
      sponsor_party TEXT,
      sponsor_state TEXT,
      introduced_date TEXT,
      latest_action_date TEXT,
      latest_action_text TEXT,
      status TEXT DEFAULT 'introduced',
      issue_categories TEXT,
      impact_score INTEGER DEFAULT 0,
      cosponsor_count INTEGER DEFAULT 0,
      cosponsors TEXT,
      congress_url TEXT,
      synced_to_algolia_at DATETIME,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      smartbucket_key TEXT,
      synced_to_smartbucket_at DATETIME,
      searchable_text TEXT,
      plain_english_summary TEXT,
      tracking_count INTEGER DEFAULT 0
    )
  `);
  logs.push('✅ Created bills_new table');

  // Step 2: Copy existing data
  await runStatement('INSERT INTO bills_new SELECT * FROM bills');
  logs.push('✅ Copied data from old table');

  // Step 3: Drop old table
  await runStatement('DROP TABLE bills');
  logs.push('✅ Dropped old table');

  // Step 4: Rename new table
  await runStatement('ALTER TABLE bills_new RENAME TO bills');
  logs.push('✅ Renamed table');

  // Step 5: Recreate indices
  const indices = [
    'CREATE INDEX IF NOT EXISTS idx_bills_searchable_text ON bills(searchable_text)',
    'CREATE INDEX IF NOT EXISTS idx_bills_smartbucket_sync ON bills(synced_to_smartbucket_at)',
    'CREATE INDEX IF NOT EXISTS idx_bills_tracking_count ON bills(tracking_count DESC, latest_action_date DESC)',
    'CREATE INDEX IF NOT EXISTS idx_bills_congress ON bills(congress)',
    'CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status)'
  ];

  for (const sql of indices) {
    await runStatement(sql);
  }
  logs.push('✅ Recreated indices');

  logs.push('✅ Migration 002 complete!');
  return logs;
}

export async function POST() {
  try {
    console.log('🚀 Starting database migrations...');

    const allLogs: string[] = [];

    // Run migration 001
    const logs001 = await runMigration001();
    allLogs.push(...logs001);

    // Run migration 002
    const logs002 = await runMigration002();
    allLogs.push(...logs002);

    return NextResponse.json({
      success: true,
      message: 'All migrations completed successfully',
      logs: allLogs,
      migrations: {
        '001': {
          name: 'Add search columns',
          columns: [
            'smartbucket_key: TEXT',
            'synced_to_smartbucket_at: DATETIME',
            'searchable_text: TEXT',
            'plain_english_summary: TEXT',
            'tracking_count: INTEGER'
          ]
        },
        '002': {
          name: 'Fix NOT NULL constraints',
          changes: [
            'introduced_date: NOT NULL → nullable',
            'latest_action_date: NOT NULL → nullable',
            'status: NOT NULL → nullable with default'
          ]
        }
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
