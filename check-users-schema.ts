/**
 * Check users table schema
 */

import { executeQuery } from './lib/db/client';

async function checkSchema() {
  console.log('🔍 Checking users table schema...\n');

  try {
    // Get table schema
    const result = await executeQuery(
      `PRAGMA table_info(users)`,
      'users'
    );

    console.log('Users table columns:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.name} (${row.type})`);
    });

    // Get a sample user to see actual data structure
    console.log('\n🔍 Getting sample user data...\n');
    const sampleResult = await executeQuery(
      `SELECT * FROM users LIMIT 1`,
      'users'
    );

    if (sampleResult.rows.length > 0) {
      console.log('Sample user data:');
      console.log(JSON.stringify(sampleResult.rows[0], null, 2));
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkSchema();
