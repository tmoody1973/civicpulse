#!/usr/bin/env tsx
/**
 * Add Statistics Columns to Representatives Table
 *
 * Adds pre-computed statistics columns to avoid calculating on every request:
 * - bills_sponsored_total: Total number of bills sponsored
 * - bills_cosponsored_total: Total number of bills co-sponsored
 * - bills_laws_passed: Number of sponsored bills that became law
 * - bills_active: Number of currently active sponsored bills
 * - policy_areas_count: Number of distinct policy areas
 * - stats_updated_at: Last time stats were calculated
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function runMigration() {
  try {
    console.log('🔧 Starting database migration: Add stats columns to representatives table\n');

    const columns = [
      'bills_sponsored_total INTEGER DEFAULT 0',
      'bills_cosponsored_total INTEGER DEFAULT 0',
      'bills_laws_passed INTEGER DEFAULT 0',
      'bills_active INTEGER DEFAULT 0',
      'policy_areas_count INTEGER DEFAULT 0',
      'stats_updated_at TIMESTAMP'
    ];

    for (const column of columns) {
      const columnName = column.split(' ')[0];
      console.log(`📝 Adding column: ${columnName}`);

      const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'representatives',
          query: `ALTER TABLE representatives ADD COLUMN ${column}`
        })
      });

      if (!response.ok) {
        const error = await response.text();
        // Column might already exist
        if (error.includes('duplicate column name')) {
          console.log(`⚠️  Column ${columnName} already exists, skipping...`);
        } else {
          throw new Error(`Failed to add column ${columnName}: ${error}`);
        }
      } else {
        console.log(`✅ Added column: ${columnName}`);
      }
    }

    console.log('\n✅ Migration complete! New columns added:');
    console.log('  - bills_sponsored_total');
    console.log('  - bills_cosponsored_total');
    console.log('  - bills_laws_passed');
    console.log('  - bills_active');
    console.log('  - policy_areas_count');
    console.log('  - stats_updated_at');
    console.log('\nNext step: Run populate-stats.ts to calculate and populate stats for all representatives');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
