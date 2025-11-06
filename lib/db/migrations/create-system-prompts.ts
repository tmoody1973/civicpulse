/**
 * Database Migration: Create system_prompts table
 *
 * Stores editable system prompts for various features
 */

import { executeQuery } from '@/lib/db/client';

export async function createSystemPromptsTable() {
  await executeQuery(
    `CREATE TABLE IF NOT EXISTS system_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_key TEXT NOT NULL UNIQUE,
      prompt_text TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    'users'
  );

  console.log('✅ system_prompts table created successfully');
}

// Run migration if called directly
if (require.main === module) {
  createSystemPromptsTable()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
