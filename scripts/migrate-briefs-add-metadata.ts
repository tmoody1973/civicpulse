#!/usr/bin/env node
/**
 * Database Migration: Add metadata columns to briefs table
 *
 * Adds: headline, excerpt, category, author columns
 * Run with: npx tsx scripts/migrate-briefs-add-metadata.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { executeQuery } from '../lib/db/client';

async function migrateBriefsTable() {
  console.log('📝 Adding metadata columns to briefs table...');

  try {
    // Check if columns already exist
    console.log('🔍 Checking existing table structure...');

    const tableInfo = await executeQuery(
      `PRAGMA table_info(briefs)`,
      'users'
    );

    const existingColumns = tableInfo.rows.map((row: any) => row.name);
    console.log('   Existing columns:', existingColumns.join(', '));

    // Add headline column if not exists
    if (!existingColumns.includes('headline')) {
      console.log('➕ Adding headline column...');
      await executeQuery(
        `ALTER TABLE briefs ADD COLUMN headline TEXT`,
        'users'
      );
      console.log('   ✅ headline column added');
    } else {
      console.log('   ⏭️  headline column already exists');
    }

    // Add excerpt column if not exists
    if (!existingColumns.includes('excerpt')) {
      console.log('➕ Adding excerpt column...');
      await executeQuery(
        `ALTER TABLE briefs ADD COLUMN excerpt TEXT`,
        'users'
      );
      console.log('   ✅ excerpt column added');
    } else {
      console.log('   ⏭️  excerpt column already exists');
    }

    // Add category column if not exists
    if (!existingColumns.includes('category')) {
      console.log('➕ Adding category column...');
      await executeQuery(
        `ALTER TABLE briefs ADD COLUMN category TEXT`,
        'users'
      );
      console.log('   ✅ category column added');
    } else {
      console.log('   ⏭️  category column already exists');
    }

    // Add author column if not exists
    if (!existingColumns.includes('author')) {
      console.log('➕ Adding author column...');
      await executeQuery(
        `ALTER TABLE briefs ADD COLUMN author TEXT DEFAULT 'Civic Pulse AI'`,
        'users'
      );
      console.log('   ✅ author column added');
    } else {
      console.log('   ⏭️  author column already exists');
    }

    // Verify migration
    console.log('🔍 Verifying migration...');
    const updatedTableInfo = await executeQuery(
      `PRAGMA table_info(briefs)`,
      'users'
    );
    const updatedColumns = updatedTableInfo.rows.map((row: any) => row.name);
    console.log('   Updated columns:', updatedColumns.join(', '));

    console.log('\n✅ Migration complete!');
    console.log('   New columns: headline, excerpt, category, author');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateBriefsTable()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
