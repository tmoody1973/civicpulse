#!/usr/bin/env tsx
/**
 * Post-Fetch Pipeline
 * 
 * Runs all processing steps after the fetch completes:
 * 1. AI policy area inference (for bills without official policy areas)
 * 2. Index bills in SmartBuckets (for semantic search)
 * 3. Sync bills to Algolia (for fast keyword search)
 * 4. Test all search functionality
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { spawn } from 'child_process';

config({ path: resolve(process.cwd(), '.env.local') });

function runScript(scriptPath: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${scriptPath} ${args.join(' ')}\n`);
    
    const child = spawn('npx', ['tsx', scriptPath, ...args], {
      stdio: 'inherit',
      env: process.env
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Script failed with code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Post-Fetch Pipeline Starting');
  console.log('='.repeat(60));
  console.log('\nThis will run the following steps:');
  console.log('1. AI Policy Area Inference (~10 mins)');
  console.log('2. SmartBuckets Indexing (~5-10 mins)');
  console.log('3. Algolia Sync (~2 mins)');
  console.log('4. Search Functionality Tests (~1 min)');
  console.log('\nTotal estimated time: ~20-25 minutes\n');
  console.log('='.repeat(60));

  try {
    // Step 1: AI Policy Area Inference
    console.log('\n📋 STEP 1: AI Policy Area Inference');
    console.log('='.repeat(60));
    await runScript('scripts/infer-policy-areas.ts');
    console.log('✅ Policy area inference complete!\n');

    // Step 2: SmartBuckets Indexing
    console.log('\n📋 STEP 2: SmartBuckets Indexing');
    console.log('='.repeat(60));
    await runScript('scripts/index-smartbuckets-119.ts');
    console.log('✅ SmartBuckets indexing complete!\n');

    // Step 3: Algolia Sync
    console.log('\n📋 STEP 3: Algolia Sync');
    console.log('='.repeat(60));
    await runScript('scripts/sync-algolia-simple.ts');
    console.log('✅ Algolia sync complete!\n');

    // Step 4: Test Search
    console.log('\n📋 STEP 4: Search Functionality Tests');
    console.log('='.repeat(60));
    await runScript('scripts/test-smartbucket-search.ts');
    console.log('✅ Search tests complete!\n');

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 POST-FETCH PIPELINE COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n✅ All processing steps finished successfully!');
    console.log('\nYour database now has:');
    console.log('  • All 119th Congress bills with full metadata');
    console.log('  • AI-inferred policy areas for uncategorized bills');
    console.log('  • Semantic search via SmartBuckets');
    console.log('  • Fast keyword search via Algolia');
    console.log('\n🚀 Ready to build features!');
    console.log('\nNext steps:');
    console.log('  1. Update frontend search page to use new data');
    console.log('  2. Build "Laws" feature (enacted bills)');
    console.log('  3. Create personalized briefings');
    console.log('  4. Generate podcasts from trending bills');
    console.log('='.repeat(60));
    console.log();

  } catch (error: any) {
    console.error('\n❌ Pipeline failed:', error.message);
    console.error('\nYou can run individual steps manually:');
    console.error('  1. npx tsx scripts/infer-policy-areas.ts');
    console.error('  2. npx tsx scripts/index-smartbuckets-119.ts');
    console.error('  3. npx tsx scripts/sync-algolia-simple.ts');
    console.error('  4. npx tsx scripts/test-smartbucket-search.ts');
    process.exit(1);
  }
}

main();
