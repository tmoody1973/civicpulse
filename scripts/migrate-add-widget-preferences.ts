#!/usr/bin/env tsx
/**
 * Add widget_preferences column to users table
 *
 * This migration adds the widget_preferences field to store
 * dashboard widget customization preferences (show/hide, order)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function runMigration() {
  console.log('\n📋 Adding widget_preferences Column to Users Table\n');
  console.log('='.repeat(60));

  if (!RAINDROP_SERVICE_URL) {
    console.error('❌ RAINDROP_SERVICE_URL not set');
    process.exit(1);
  }

  // Add widget_preferences column
  try {
    console.log('\n📝 Adding column: widget_preferences (TEXT)');

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'users',
        query: 'ALTER TABLE users ADD COLUMN widget_preferences TEXT'
      })
    });

    if (response.ok) {
      console.log('✅ Added widget_preferences column');
    } else {
      const error = await response.text();

      // Check if column already exists
      if (error.includes('duplicate column') || error.includes('already exists')) {
        console.log('⚠️  widget_preferences already exists (skipping)');
      } else {
        console.error('❌ Failed to add widget_preferences:', error.substring(0, 100));
      }
    }
  } catch (error: any) {
    console.error('❌ Error adding widget_preferences:', error.message);
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
        const marker = col.name === 'widget_preferences' ? '🆕' : '  ';
        console.log(`${marker} ${col.name} (${col.type})`);
      });
    }
  } catch (error: any) {
    console.error('❌ Error verifying schema:', error.message);
  }

  console.log('\n✅ Done!\n');
}

runMigration();
