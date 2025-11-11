#!/usr/bin/env tsx
/**
 * Create news_articles table for shared news pool
 *
 * This migration creates the news_articles table to store news from
 * the scheduled refresh function (shared pool, not per-user)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function runMigration() {
  console.log('\n📋 Creating news_articles Table (Shared Pool)\n');
  console.log('='.repeat(60));

  if (!RAINDROP_SERVICE_URL) {
    console.error('❌ RAINDROP_SERVICE_URL not set');
    process.exit(1);
  }

  console.log(`🔗 Using Raindrop service: ${RAINDROP_SERVICE_URL}`);

  // Read migration SQL file
  const migrationSQL = readFileSync(
    resolve(process.cwd(), 'lib/db/migrations/008_create_news_articles_shared_pool.sql'),
    'utf-8'
  );

  // Remove comment lines and split by semicolon
  const cleanSQL = migrationSQL
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && line.trim())
    .join('\n');

  const statements = cleanSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`\n📝 Executing ${statements.length} SQL statements...\n`);

  for (const statement of statements) {
    try {
      const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
      console.log(`Executing: ${preview}...`);

      const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'news_articles',
          query: statement
        })
      });

      if (response.ok) {
        console.log('✅ Success');
      } else {
        const error = await response.text();

        // Check if table/index already exists
        if (
          error.includes('already exists') ||
          error.includes('duplicate')
        ) {
          console.log('⚠️  Already exists (skipping)');
        } else {
          console.error('❌ Failed:', error.substring(0, 100));
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration complete!\n');

  // Verify table creation
  console.log('📋 Verifying table schema...\n');

  try {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'news_articles',
        query: 'PRAGMA table_info(news_articles)'
      })
    });

    const data = await response.json();

    if (data.rows) {
      console.log('Columns in news_articles table:');
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
