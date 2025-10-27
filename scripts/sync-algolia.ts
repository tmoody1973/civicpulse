#!/usr/bin/env tsx
/**
 * Algolia Sync Script
 *
 * Run this script to sync bills to Algolia search index
 *
 * Usage:
 *   npm run sync-algolia          # Incremental sync (recent bills only)
 *   npm run sync-algolia:full     # Full sync (all bills)
 *   npm run sync-algolia:test     # Test connection only
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { performFullSync, performIncrementalSync, testAlgoliaConnection, getAlgoliaStats } from '../lib/search/algolia-sync';

async function main() {
  const command = process.argv[2] || 'incremental';
  const congress = parseInt(process.argv[3] || '119');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' 🔍 Civic Pulse - Algolia Sync');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test connection first
  const isConnected = await testAlgoliaConnection();
  if (!isConnected) {
    console.error('\n❌ Cannot connect to Algolia. Check your API keys in .env.local\n');
    process.exit(1);
  }

  console.log('');

  try {
    switch (command) {
      case 'full':
        console.log(`🚀 Running FULL sync for Congress ${congress}...`);
        console.log('⚠️ This may take 10-30 minutes for 10,000+ bills\n');

        const fullSynced = await performFullSync(congress);

        console.log(`\n✅ Full sync completed: ${fullSynced} bills indexed\n`);
        break;

      case 'incremental':
        console.log(`🔄 Running INCREMENTAL sync for Congress ${congress}...`);
        console.log('📥 Fetching bills updated in last 24 hours\n');

        const incrementalSynced = await performIncrementalSync(congress);

        console.log(`\n✅ Incremental sync completed: ${incrementalSynced} bills updated\n`);
        break;

      case 'test':
        console.log('✅ Connection test passed\n');
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Valid commands: full, incremental, test\n');
        process.exit(1);
    }

    // Show stats
    console.log('📊 Algolia Index Stats:');
    const stats = await getAlgoliaStats();
    console.log(`   Records: ${stats.numberOfRecords.toLocaleString()}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' ✅ Sync complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main();
