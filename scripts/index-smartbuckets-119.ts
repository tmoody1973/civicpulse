#!/usr/bin/env tsx
/**
 * SmartBuckets Indexing Script for 119th Congress
 * 
 * Indexes all bills with full text into SmartBuckets for semantic search.
 * This enables queries like "bills about renewable energy" or "climate change mitigation"
 * instead of just keyword matching.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

interface Progress {
  lastProcessedId: string;
  totalIndexed: number;
  timestamp: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function saveProgress(billId: string, totalIndexed: number) {
  try {
    mkdirSync('./progress', { recursive: true });
  } catch {}

  const progress: Progress = {
    lastProcessedId: billId,
    totalIndexed,
    timestamp: new Date().toISOString()
  };

  writeFileSync('./progress/smartbucket-index-progress.json', JSON.stringify(progress, null, 2));
}

function loadProgress(): Progress | null {
  try {
    const data = readFileSync('./progress/smartbucket-index-progress.json', 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Format bill for SmartBucket indexing
 */
function formatBillForSmartBucket(bill: any): string {
  const parts: string[] = [];

  // Header
  parts.push(`Bill ID: ${bill.id}`);
  parts.push(`Congress: ${bill.congress}`);
  parts.push(`Bill Type: ${bill.bill_type}`);
  parts.push(`Bill Number: ${bill.bill_number}`);
  parts.push('');

  // Title
  parts.push(`Title: ${bill.title}`);
  parts.push('');

  // Sponsor
  if (bill.sponsor_name) {
    parts.push(`Sponsor: ${bill.sponsor_name}`);
    if (bill.sponsor_party && bill.sponsor_state) {
      parts.push(`Party: ${bill.sponsor_party}-${bill.sponsor_state}${bill.sponsor_district ? `-${bill.sponsor_district}` : ''}`);
    }
    parts.push('');
  }

  // Status and dates
  parts.push(`Status: ${bill.status}`);
  if (bill.introduced_date) {
    parts.push(`Introduced: ${bill.introduced_date}`);
  }
  if (bill.latest_action_date) {
    parts.push(`Latest Action: ${bill.latest_action_date} - ${bill.latest_action_text || 'N/A'}`);
  }
  parts.push('');

  // Policy area and categories
  if (bill.policy_area) {
    parts.push(`Policy Area: ${bill.policy_area}`);
  }
  if (bill.issue_categories) {
    try {
      const categories = typeof bill.issue_categories === 'string' 
        ? JSON.parse(bill.issue_categories) 
        : bill.issue_categories;
      if (Array.isArray(categories) && categories.length > 0) {
        parts.push(`Categories: ${categories.join(', ')}`);
      }
    } catch {}
  }
  parts.push('');

  // Committees
  if (bill.committees) {
    try {
      const committees = typeof bill.committees === 'string' 
        ? JSON.parse(bill.committees) 
        : bill.committees;
      if (Array.isArray(committees) && committees.length > 0) {
        parts.push('Committees:');
        committees.forEach(c => parts.push(`  - ${c}`));
        parts.push('');
      }
    } catch {}
  }

  // Cosponsor count
  if (bill.cosponsor_count > 0) {
    parts.push(`Cosponsors: ${bill.cosponsor_count}`);
    parts.push('');
  }

  // Summary
  if (bill.summary) {
    parts.push('Summary:');
    parts.push(bill.summary);
    parts.push('');
  }

  // Full text
  if (bill.full_text) {
    parts.push('Full Legislative Text:');
    parts.push('---');
    parts.push(bill.full_text);
  }

  return parts.join('\n');
}

/**
 * Get bills with full text from database
 */
async function getBillsWithFullText(limit: number = 100, offset: number = 0): Promise<any[]> {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `
        SELECT * FROM bills
        WHERE full_text IS NOT NULL
        AND full_text != ''
        AND congress = 119
        ORDER BY id
        LIMIT ${limit} OFFSET ${offset}
      `
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bills: ${response.status}`);
  }

  const data = await response.json();
  return data.rows || [];
}

/**
 * Index a single bill in SmartBuckets
 */
async function indexBillInSmartBucket(bill: any): Promise<boolean> {
  try {
    const content = formatBillForSmartBucket(bill);

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/smartbucket/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: bill.id,
        content: content,
        metadata: {
          bill_type: bill.bill_type,
          bill_number: bill.bill_number,
          congress: bill.congress,
          title: bill.title,
          sponsor: bill.sponsor_name,
          status: bill.status,
          policy_area: bill.policy_area,
          introduced_date: bill.introduced_date
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SmartBucket sync failed: ${response.status} - ${errorText}`);
    }

    // Update database to mark as synced
    await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: 'UPDATE bills SET synced_to_smartbucket_at = CURRENT_TIMESTAMP, smartbucket_key = ? WHERE id = ?',
        params: [bill.id, bill.id]
      })
    });

    return true;
  } catch (error: any) {
    console.error(`   ❌ Error indexing ${bill.id}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting SmartBuckets Indexing for 119th Congress\n');
  console.log('='.repeat(60));
  console.log('Target: All bills with full text from 119th Congress');
  console.log('Operation: Index in SmartBuckets for semantic search');
  console.log('='.repeat(60));

  // Check for previous progress
  const previousProgress = loadProgress();
  let startOffset = 0;

  if (previousProgress) {
    console.log(`\n⏮️  Found previous progress:`);
    console.log(`   Last processed: ${previousProgress.lastProcessedId}`);
    console.log(`   Total indexed: ${previousProgress.totalIndexed}`);
    console.log(`   Timestamp: ${previousProgress.timestamp}`);
    console.log('\n   Resuming from where we left off...\n');
    startOffset = previousProgress.totalIndexed;
  }

  let totalIndexed = previousProgress?.totalIndexed || 0;
  let totalFailed = 0;
  let offset = startOffset;
  const batchSize = 100;

  while (true) {
    console.log(`\n📥 Fetching batch (offset: ${offset}, limit: ${batchSize})...`);
    
    const bills = await getBillsWithFullText(batchSize, offset);
    
    if (bills.length === 0) {
      console.log('✅ No more bills to process');
      break;
    }

    console.log(`   Found ${bills.length} bills with full text`);

    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      const billIndex = offset + i + 1;

      console.log(`\n[${billIndex}] ${bill.id} - ${bill.bill_type.toUpperCase()} ${bill.bill_number}`);
      console.log(`   Title: ${bill.title.substring(0, 60)}...`);
      console.log(`   Full text size: ${bill.full_text?.length || 0} chars`);
      
      const success = await indexBillInSmartBucket(bill);
      
      if (success) {
        totalIndexed++;
        console.log(`   ✅ Indexed successfully`);
        saveProgress(bill.id, totalIndexed);
      } else {
        totalFailed++;
        console.log(`   ❌ Failed to index`);
      }

      // Progress update every 10 bills
      if ((billIndex) % 10 === 0) {
        console.log(`\n   📊 Progress: ${totalIndexed} indexed, ${totalFailed} failed`);
      }

      // Small delay to avoid overwhelming the service
      await sleep(100);
    }

    offset += bills.length;

    // If we got fewer bills than requested, we're done
    if (bills.length < batchSize) {
      console.log('\n✅ Reached end of bills with full text');
      break;
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ SmartBuckets Indexing Complete!');
  console.log('='.repeat(60));
  console.log(`📊 Final Statistics:`);
  console.log(`   Total indexed: ${totalIndexed}`);
  console.log(`   Total failed: ${totalFailed}`);
  console.log(`   Success rate: ${Math.round(totalIndexed / (totalIndexed + totalFailed) * 100)}%`);
  console.log('='.repeat(60));
  console.log('\n✅ Semantic search is now enabled!');
  console.log('   Test with: npx tsx scripts/test-smartbucket-search.ts');
  console.log();
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
