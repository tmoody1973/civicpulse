#!/usr/bin/env tsx
/**
 * Real-time Indexing Monitor
 *
 * Watch both SmartBucket and Algolia indexing progress in real-time
 *
 * Usage:
 *   npm run index:monitor
 */

import { readFileSync } from 'fs';

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

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 60) {
    return `${diffSecs}s ago`;
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  }
}

function displayProgress() {
  // Clear screen
  console.clear();

  console.log('🔄 Real-time Indexing Monitor');
  console.log('='.repeat(80));
  console.log();

  // SmartBucket progress
  const smartbucketProgress = loadProgress('smartbucket-all-progress.json');
  if (smartbucketProgress) {
    const timeAgo = formatTimestamp(smartbucketProgress.timestamp);
    console.log('🪣  SmartBucket (Semantic Search)');
    console.log(`   ├─ Bills indexed: ${smartbucketProgress.totalIndexed.toLocaleString()}`);
    console.log(`   ├─ Last bill: ${smartbucketProgress.lastProcessedId}`);
    console.log(`   └─ Updated: ${timeAgo}`);
  } else {
    console.log('🪣  SmartBucket: Waiting to start...');
  }

  console.log();

  // Algolia progress
  const algoliaProgress = loadProgress('algolia-progress.json');
  if (algoliaProgress) {
    const timeAgo = formatTimestamp(algoliaProgress.timestamp);
    console.log('🔍 Algolia (Full-text Search)');
    console.log(`   ├─ Bills indexed: ${algoliaProgress.totalIndexed.toLocaleString()}`);
    console.log(`   ├─ Last bill: ${algoliaProgress.lastProcessedId}`);
    console.log(`   └─ Updated: ${timeAgo}`);
  } else {
    console.log('🔍 Algolia: Waiting to start...');
  }

  console.log();
  console.log('='.repeat(80));

  // Show estimated completion
  if (smartbucketProgress || algoliaProgress) {
    const totalBills = 15000; // Approximate total bills across 3 congresses
    const sbProgress = smartbucketProgress ? (smartbucketProgress.totalIndexed / totalBills * 100).toFixed(1) : '0.0';
    const algoliaProgress_ = algoliaProgress ? (algoliaProgress.totalIndexed / totalBills * 100).toFixed(1) : '0.0';

    console.log(`SmartBucket: ${sbProgress}% complete`);
    console.log(`Algolia:     ${algoliaProgress_}% complete`);
    console.log();
  }

  console.log('Press Ctrl+C to exit');
  console.log('Refreshing every 5 seconds...');
}

function main() {
  // Display immediately
  displayProgress();

  // Update every 5 seconds
  setInterval(displayProgress, 5000);
}

main();
