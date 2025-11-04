#!/usr/bin/env tsx
/**
 * Unified Indexing Runner
 *
 * Runs both SmartBucket and Algolia indexing in parallel
 * Both scripts support progress tracking and resuming from checkpoints
 *
 * Usage:
 *   npm run index:all           # Resume both from last checkpoint
 *   npm run index:all --clear   # Clear progress and start fresh
 *   npm run index:smartbucket   # Run only SmartBucket indexing
 *   npm run index:algolia       # Run only Algolia indexing
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

interface Progress {
  lastProcessedId: string;
  totalIndexed: number;
  timestamp: string;
}

function loadProgress(filename: string): Progress | null {
  try {
    const data = readFileSync(`./progress/${filename}`, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function runScript(scriptPath: string, args: string[] = []): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', scriptPath, ...args], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output: `Process exited with code ${code}`
      });
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        output: error.message
      });
    });
  });
}

async function showStatus() {
  console.log('\n📊 Current Indexing Status\n');
  console.log('='.repeat(60));

  // SmartBucket progress
  const smartbucketProgress = loadProgress('smartbucket-all-progress.json');
  if (smartbucketProgress) {
    console.log('🪣 SmartBucket:');
    console.log(`   Last processed: ${smartbucketProgress.lastProcessedId}`);
    console.log(`   Total indexed: ${smartbucketProgress.totalIndexed}`);
    console.log(`   Timestamp: ${smartbucketProgress.timestamp}`);
  } else {
    console.log('🪣 SmartBucket: No progress yet');
  }

  console.log();

  // Algolia progress
  const algoliaProgress = loadProgress('algolia-progress.json');
  if (algoliaProgress) {
    console.log('🔍 Algolia:');
    console.log(`   Last processed: ${algoliaProgress.lastProcessedId}`);
    console.log(`   Total indexed: ${algoliaProgress.totalIndexed}`);
    console.log(`   Timestamp: ${algoliaProgress.timestamp}`);
  } else {
    console.log('🔍 Algolia: No progress yet');
  }

  console.log('='.repeat(60));
  console.log();
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  console.log('🚀 HakiVo Indexing Runner\n');

  // Show current status
  await showStatus();

  const scriptArgs = args.slice(1); // Pass remaining args to scripts

  switch (command) {
    case 'all':
      console.log('▶️  Running both SmartBucket and Algolia indexing...\n');
      console.log('⚠️  Both scripts will run sequentially');
      console.log('⚠️  This may take 30-60 minutes depending on database size\n');

      // Run SmartBucket first
      console.log('🪣 Starting SmartBucket indexing...\n');
      const smartbucketResult = await runScript('./scripts/index-all-smartbuckets.ts', scriptArgs);

      if (!smartbucketResult.success) {
        console.error('\n❌ SmartBucket indexing failed');
        process.exit(1);
      }

      console.log('\n✅ SmartBucket indexing complete\n');

      // Then run Algolia
      console.log('🔍 Starting Algolia indexing...\n');
      const algoliaResult = await runScript('./scripts/sync-algolia-simple.ts', scriptArgs);

      if (!algoliaResult.success) {
        console.error('\n❌ Algolia indexing failed');
        process.exit(1);
      }

      console.log('\n✅ Algolia indexing complete\n');
      break;

    case 'smartbucket':
      console.log('🪣 Running SmartBucket indexing only...\n');
      const sbResult = await runScript('./scripts/index-all-smartbuckets.ts', scriptArgs);
      if (!sbResult.success) {
        console.error('\n❌ SmartBucket indexing failed');
        process.exit(1);
      }
      break;

    case 'algolia':
      console.log('🔍 Running Algolia indexing only...\n');
      const algResult = await runScript('./scripts/sync-algolia-simple.ts', scriptArgs);
      if (!algResult.success) {
        console.error('\n❌ Algolia indexing failed');
        process.exit(1);
      }
      break;

    case 'status':
      // Status already shown above
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('\nValid commands:');
      console.log('  all          - Run both SmartBucket and Algolia indexing');
      console.log('  smartbucket  - Run only SmartBucket indexing');
      console.log('  algolia      - Run only Algolia indexing');
      console.log('  status       - Show current progress');
      process.exit(1);
  }

  // Show final status
  console.log('\n✨ Indexing complete!\n');
  await showStatus();
}

main().catch(error => {
  console.error('\n❌ Runner failed:', error);
  process.exit(1);
});
