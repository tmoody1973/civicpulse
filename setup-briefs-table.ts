#!/usr/bin/env node
/**
 * Setup Briefs Table in Raindrop SmartSQL
 *
 * Creates the 'briefs' table in the correct namespace to store generated daily briefs.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { executeQuery } from './lib/db/client';

async function setupBriefsTable() {
  try {
    console.log('📋 Setting up briefs table in Raindrop SmartSQL...');

    // Check if table exists
    console.log('\n1️⃣ Checking existing tables...');
    const existingTables = await executeQuery(
      "SELECT name FROM sqlite_master WHERE type='table'",
      'briefs'
    );
    console.log('   Found tables:', existingTables.rows);

    // Create the briefs table
    console.log('\n2️⃣ Creating briefs table...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS briefs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        audio_url TEXT NOT NULL,
        duration INTEGER NOT NULL,
        transcript TEXT,
        bills_covered TEXT,
        written_digest TEXT,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await executeQuery(createTableSQL, 'briefs');
    console.log('   ✅ Briefs table created successfully');

    // Create an index on user_id for faster queries
    console.log('\n3️⃣ Creating index on user_id...');
    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_briefs_user_id ON briefs(user_id)
    `;

    await executeQuery(createIndexSQL, 'briefs');
    console.log('   ✅ Index created successfully');

    // Verify table was created
    console.log('\n4️⃣ Verifying table creation...');
    const verifyTables = await executeQuery(
      "SELECT name FROM sqlite_master WHERE type='table'",
      'briefs'
    );
    console.log('   Tables in briefs namespace:', verifyTables.rows);

    // Check table schema
    console.log('\n5️⃣ Checking table schema...');
    const schemaResult = await executeQuery(
      "PRAGMA table_info(briefs)",
      'briefs'
    );
    console.log('   Briefs table schema:');
    schemaResult.rows.forEach((col: any) => {
      console.log(`   - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''}`);
    });

    console.log('\n✅ Briefs table setup complete!');
    console.log('📊 You can now generate briefs and they will be saved to this table.');

  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupBriefsTable();
