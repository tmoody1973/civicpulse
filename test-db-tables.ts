#!/usr/bin/env node
import { executeQuery } from './lib/db/client.js';

async function checkTables() {
  try {
    console.log('📋 Checking tables in users namespace...');
    const result = await executeQuery(
      "SELECT name FROM sqlite_master WHERE type='table'",
      'users'
    );
    console.log('Tables found:', result.rows);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkTables();
