/**
 * Database Migration: Add title and featured_image_url to briefs table
 */

import { executeQuery } from '@/lib/db/client';

export async function addBriefMetadata() {
  try {
    // Add title column
    await executeQuery(
      `ALTER TABLE briefs ADD COLUMN title TEXT`,
      'users'
    );
    console.log('✅ Added title column to briefs table');

    // Add featured_image_url column
    await executeQuery(
      `ALTER TABLE briefs ADD COLUMN featured_image_url TEXT`,
      'users'
    );
    console.log('✅ Added featured_image_url column to briefs table');

    console.log('✅ Migration completed successfully');
  } catch (error) {
    // If columns already exist, SQLite will throw an error - that's okay
    console.log('ℹ️  Columns may already exist:', error);
  }
}

// Run migration if called directly
if (require.main === module) {
  addBriefMetadata()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
