#!/usr/bin/env node
/**
 * Add Image Columns to Briefs Table
 *
 * Adds featured image columns to store Unsplash images for briefs.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { executeQuery } from './lib/db/client';

async function addImageColumns() {
  try {
    console.log('📋 Adding image columns to briefs table...');

    // Add featured image columns
    console.log('\n1️⃣ Adding image columns...');

    const alterTableSQL = `
      ALTER TABLE briefs ADD COLUMN featured_image_url TEXT;
      ALTER TABLE briefs ADD COLUMN featured_image_alt TEXT;
      ALTER TABLE briefs ADD COLUMN featured_image_photographer TEXT;
      ALTER TABLE briefs ADD COLUMN featured_image_photographer_url TEXT;
    `;

    // SQLite doesn't support multiple ALTER TABLEs in one statement
    // So we'll run them one by one
    const columns = [
      'featured_image_url TEXT',
      'featured_image_alt TEXT',
      'featured_image_photographer TEXT',
      'featured_image_photographer_url TEXT'
    ];

    for (const column of columns) {
      const columnName = column.split(' ')[0];
      try {
        await executeQuery(`ALTER TABLE briefs ADD COLUMN ${column}`, 'briefs');
        console.log(`   ✅ Added column: ${columnName}`);
      } catch (error: any) {
        // Ignore "duplicate column" errors (column already exists)
        if (error.message.includes('duplicate column')) {
          console.log(`   ⏭️  Column ${columnName} already exists, skipping`);
        } else {
          throw error;
        }
      }
    }

    // Verify the new schema
    console.log('\n2️⃣ Verifying updated schema...');
    const schemaResult = await executeQuery(
      "PRAGMA table_info(briefs)",
      'briefs'
    );
    console.log('   Updated briefs table schema:');
    schemaResult.rows.forEach((col: any) => {
      console.log(`   - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''}`);
    });

    console.log('\n✅ Image columns added successfully!');
    console.log('🖼️  Briefs can now store featured images from Unsplash.');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

addImageColumns();
