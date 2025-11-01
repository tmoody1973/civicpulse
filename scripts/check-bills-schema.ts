#!/usr/bin/env tsx
/**
 * Check Bills Table Schema
 *
 * Queries the database to see the current schema of the bills table
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function checkSchema() {
  try {
    console.log('🔍 Checking bills table schema...\n');

    // Query to get table schema (SQLite-specific)
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: `PRAGMA table_info(bills)`
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to query schema: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('📊 Current Schema:');
    console.log(JSON.stringify(data.rows, null, 2));

    // Also get a sample row to see what data looks like
    const sampleResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: `SELECT * FROM bills LIMIT 1`
      })
    });

    if (sampleResponse.ok) {
      const sampleData = await sampleResponse.json();
      console.log('\n📝 Sample Row (first bill):');
      console.log(JSON.stringify(sampleData.rows[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSchema();
