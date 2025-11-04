#!/usr/bin/env tsx
/**
 * Verify briefs table exists and show schema
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
  console.log('\n🔍 Verifying Briefs Table\n');
  console.log('='.repeat(60));

  try {
    // Check if table exists
    console.log('\n1️⃣  Checking if briefs table exists...');
    const tableCheck = await executeQuery(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='briefs'`,
      'users'
    );

    if (!tableCheck.rows || tableCheck.rows.length === 0) {
      console.log('❌ Briefs table does NOT exist');
      console.log('\n💡 Run: npx tsx scripts/create-briefs-table.ts\n');
      process.exit(1);
    }

    console.log('✅ Briefs table exists!');

    // Get schema
    console.log('\n2️⃣  Getting table schema...');
    const schema = await executeQuery(`PRAGMA table_info(briefs)`, 'users');
    console.log(`\n📊 Table schema (${schema.rows.length} columns):`);
    schema.rows.forEach((col: any) => {
      console.log(`   ${col.name.padEnd(20)} ${col.type.padEnd(10)} ${col.notnull ? 'NOT NULL' : ''}`);
    });

    // Check row count
    console.log('\n3️⃣  Counting rows...');
    const count = await executeQuery(`SELECT COUNT(*) as count FROM briefs`, 'users');
    const totalRows = count.rows[0].count;
    console.log(`\n📈 Total briefs: ${totalRows}`);

    if (totalRows === 0) {
      console.log('\n⚠️  No briefs in database yet.');
      console.log('   This is expected if you haven\'t generated any briefs.');
    } else {
      // Show sample data
      console.log('\n4️⃣  Sample data (first 3 briefs):');
      const sample = await executeQuery(
        `SELECT
          id,
          user_id,
          type,
          duration,
          LENGTH(audio_url) as audio_url_length,
          LENGTH(transcript) as transcript_length,
          LENGTH(written_digest) as digest_length,
          policy_areas,
          generated_at
         FROM briefs
         ORDER BY generated_at DESC
         LIMIT 3`,
        'users'
      );

      sample.rows.forEach((row: any, idx: number) => {
        console.log(`\n   Brief ${idx + 1}:`);
        console.log(`     ID: ${row.id}`);
        console.log(`     User: ${row.user_id}`);
        console.log(`     Type: ${row.type}`);
        console.log(`     Duration: ${row.duration}s (${Math.floor(row.duration / 60)}m ${row.duration % 60}s)`);
        console.log(`     Audio URL length: ${row.audio_url_length} chars`);
        console.log(`     Transcript: ${row.transcript_length} chars`);
        console.log(`     Digest: ${row.digest_length} chars`);
        console.log(`     Policy areas: ${row.policy_areas}`);
        console.log(`     Generated: ${row.generated_at}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification complete!');
    console.log('='.repeat(60));
    console.log('\n💡 You can view briefs at: http://localhost:3000/admin');
    console.log('   Click on "briefs" in the table list.\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
