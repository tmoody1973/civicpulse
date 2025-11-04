#!/usr/bin/env tsx
/**
 * Dashboard Features Migration Runner
 *
 * Runs the dashboard migration (briefs, playback progress, etc.)
 * Uses Raindrop service URL directly via fetch
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

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
  console.log('\n🚀 Running Dashboard Features Migration\n');
  console.log('='.repeat(60));

  try {
    // Read the migration file
    const migrationPath = resolve(process.cwd(), 'lib/db/migrations/001_dashboard_features.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log(`📄 Loaded migration: ${migrationPath}`);
    console.log(`📝 Migration size: ${migrationSQL.length} characters`);
    console.log();

    // Split SQL by semicolons (each statement)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');

      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);

      try {
        await executeQuery(statement, 'users'); // Use 'users' table as default
        console.log(`   ✅ Success`);
      } catch (error: any) {
        // Ignore duplicate/already exists errors
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate')
        ) {
          console.log(`   ⏭️  Already exists, skipping`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          throw error;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📊 New tables created:');
    console.log('   - briefs: Audio brief records with transcripts');
    console.log('   - playback_progress: Track where users left off');
    console.log('   - downloaded_briefs: Offline playback tracking');
    console.log('   - news_articles: Cached Perplexity news');
    console.log('   - push_subscriptions: PWA push notifications');
    console.log('   - email_queue: Email notification queue');
    console.log('   - brief_generation_queue: Background job queue');
    console.log('\n💡 Next steps:');
    console.log('   - Run tests again: npx tsx scripts/test-brief-generation.ts');
    console.log('   - Test API: curl -X POST http://localhost:3000/api/briefs/generate-daily');
    console.log();

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
