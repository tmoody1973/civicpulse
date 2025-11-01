#!/usr/bin/env tsx
/**
 * Add onboarding_completed column to users table
 *
 * This migration adds the onboarding_completed field to track whether
 * a user has completed the onboarding flow
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function runMigration() {
  console.log('\n📋 Adding onboarding_completed Column to Users Table\n');
  console.log('='.repeat(60));

  if (!RAINDROP_SERVICE_URL) {
    console.error('❌ RAINDROP_SERVICE_URL not set');
    process.exit(1);
  }

  // Add onboarding_completed column
  try {
    console.log('\n📝 Adding column: onboarding_completed (INTEGER)');

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'users',
        query: 'ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0'
      })
    });

    if (response.ok) {
      console.log('✅ Added onboarding_completed column');
    } else {
      const error = await response.text();

      // Check if column already exists
      if (error.includes('duplicate column') || error.includes('already exists')) {
        console.log('⚠️  onboarding_completed already exists (skipping)');
      } else {
        console.error('❌ Failed to add onboarding_completed:', error.substring(0, 100));
      }
    }
  } catch (error: any) {
    console.error('❌ Error adding onboarding_completed:', error.message);
  }

  // Create index on onboarding_completed
  try {
    console.log('\n📝 Creating index: idx_users_onboarding_completed');

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'users',
        query: 'CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed)'
      })
    });

    if (response.ok) {
      console.log('✅ Created index idx_users_onboarding_completed');
    } else {
      const error = await response.text();
      console.error('❌ Failed to create index:', error.substring(0, 100));
    }
  } catch (error: any) {
    console.error('❌ Error creating index:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration complete!\n');

  // Verify schema
  console.log('📋 Verifying updated schema...\n');

  try {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'users',
        query: 'PRAGMA table_info(users)'
      })
    });

    const data = await response.json();

    if (data.rows) {
      console.log('Columns in users table:');
      data.rows.forEach((col: any) => {
        const marker = col.name === 'onboarding_completed' ? '🆕' : '  ';
        console.log(`${marker} ${col.name} (${col.type})`);
      });
    }
  } catch (error: any) {
    console.error('❌ Error verifying schema:', error.message);
  }

  console.log('\n✅ Done!\n');
}

runMigration();
