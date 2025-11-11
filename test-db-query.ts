/**
 * Quick test to check database query structure
 */

import { executeQuery } from './lib/db/client';

async function testQuery() {
  console.log('Testing database query structure...\n');

  try {
    const sql = `SELECT * FROM news_articles LIMIT 5`;
    const result = await executeQuery(sql, 'users');

    console.log('Full result object:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testQuery();
