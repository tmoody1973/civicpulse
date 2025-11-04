#!/usr/bin/env tsx
/**
 * Test Briefs Table Schema
 * Verifies that the featured_image_url and title columns exist
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function executeQuery(sql: string): Promise<any> {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table: 'users', query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Query failed: ${response.status} - ${error}`);
  }

  return response.json();
}

async function testSchema() {
  console.log('\n📊 Testing Briefs Table Schema\n');
  console.log('='.repeat(60));

  try {
    // Get table info
    const result = await executeQuery('PRAGMA table_info(briefs)');

    console.log('\n✅ Briefs table columns:\n');

    const requiredColumns = ['featured_image_url', 'title', 'written_digest', 'audio_url', 'transcript'];
    const foundColumns: string[] = [];

    result.rows.forEach((col: any) => {
      const isRequired = requiredColumns.includes(col.name);
      const marker = isRequired ? '✨' : '  ';
      console.log(`${marker} ${col.name.padEnd(25)} ${col.type || 'TEXT'}`);
      if (isRequired) foundColumns.push(col.name);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Required columns check:');
    requiredColumns.forEach(col => {
      const found = foundColumns.includes(col);
      console.log(`  ${found ? '✅' : '❌'} ${col}`);
    });

    const allFound = requiredColumns.every(col => foundColumns.includes(col));

    if (allFound) {
      console.log('\n✅ All required columns present!');
      console.log('\n💡 Ready for:');
      console.log('   - Featured image extraction from news');
      console.log('   - Written digest generation');
      console.log('   - Marketplace-style brief cards');
    } else {
      console.log('\n❌ Some required columns missing!');
      console.log('   Run: npx tsx scripts/run-featured-image-migration.ts');
    }

    console.log();

  } catch (error) {
    console.error('\n❌ Schema test failed:', error);
    process.exit(1);
  }
}

testSchema();
