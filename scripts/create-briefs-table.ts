#!/usr/bin/env tsx
/**
 * Manually create the briefs table for testing
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function executeQuery(sql: string, table: string = 'default'): Promise<any> {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Query failed: ${response.status} - ${error}`);
  }

  return response.json();
}

async function main() {
  console.log('\n🔧 Creating briefs table for testing\n');
  console.log('='.repeat(60));

  try {
    const createTableSQL = `
CREATE TABLE IF NOT EXISTS briefs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('daily', 'weekly')),
  audio_url TEXT NOT NULL,
  transcript TEXT NOT NULL,
  written_digest TEXT NOT NULL,
  news_articles TEXT,
  bills_covered TEXT NOT NULL,
  policy_areas TEXT NOT NULL,
  duration INTEGER NOT NULL,
  sections TEXT,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;

    console.log('Creating briefs table...');
    await executeQuery(createTableSQL, 'users');
    console.log('✅ Briefs table created successfully!\n');

    // Verify it was created
    const verify = await executeQuery(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='briefs'`,
      'users'
    );

    if (verify.rows && verify.rows.length > 0) {
      console.log('✅ Verified: Briefs table exists');

      // Show schema
      const schema = await executeQuery(`PRAGMA table_info(briefs)`, 'users');
      console.log(`\n📊 Table schema (${schema.rows.length} columns):`);
      schema.rows.forEach((col: any) => {
        console.log(`   ${col.name.padEnd(20)} ${col.type}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Setup complete!');
    console.log('='.repeat(60));
    console.log('\n💡 Next: Run tests to verify everything works');
    console.log('   npx tsx scripts/test-brief-generation.ts\n');

  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('✅ Briefs table already exists!');
    } else {
      console.error('❌ Failed:', error);
      process.exit(1);
    }
  }
}

main().catch(console.error);
