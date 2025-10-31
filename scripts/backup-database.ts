#!/usr/bin/env tsx
/**
 * Database Backup Script
 *
 * Creates a backup of all bills in the database before running migrations
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function backupDatabase() {
  console.log('🚀 Starting database backup...\n');

  // Create backups directory if it doesn't exist
  try {
    mkdirSync('./backups', { recursive: true });
  } catch (error) {
    // Directory already exists, ignore
  }

  try {
    // Fetch all bills
    console.log('📥 Fetching all bills from database...');
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: 'SELECT * FROM bills ORDER BY id'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bills: ${response.status}`);
    }

    const data = await response.json();
    const bills = data.rows || [];

    console.log(`✅ Fetched ${bills.length} bills\n`);

    // Create timestamp for filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `./backups/bills-backup-${timestamp}.json`;

    // Write backup file
    console.log(`💾 Writing backup to ${filename}...`);
    writeFileSync(filename, JSON.stringify(bills, null, 2));

    console.log('✅ Backup complete!\n');
    console.log('='.repeat(60));
    console.log(`📊 Backup summary:`);
    console.log(`   File: ${filename}`);
    console.log(`   Bills backed up: ${bills.length}`);
    console.log(`   File size: ${(JSON.stringify(bills).length / 1024 / 1024).toFixed(2)} MB`);
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Backup failed:', error.message);
    process.exit(1);
  }
}

backupDatabase();
