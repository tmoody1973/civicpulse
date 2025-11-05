#!/usr/bin/env tsx
/**
 * SmartBuckets Indexing Script for Congresses 118 and 119
 *
 * Indexes bills from Congress 118 and 119 with full text into SmartBuckets for semantic search.
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

  writeFileSync('./progress/smartbucket-all-progress.json', JSON.stringify(progress, null, 2));
}

function loadProgress(): Progress | null {
  try {
    const data = readFileSync('./progress/smartbucket-all-progress.json', 'utf-8');
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
    parts.push(`Latest Action: ${bill.latest_action_date}`);
    if (bill.latest_action_text) {
      parts.push(`Action: ${bill.latest_action_text}`);
    }
  }
  parts.push('');

  // Policy areas
  if (bill.policy_area) {
    parts.push(`Policy Area: ${bill.policy_area}`);
  }
  if (bill.ai_policy_area) {
    parts.push(`AI Policy Area: ${bill.ai_policy_area}`);
  }
  if (bill.issue_categories) {
    try {
      const issues = JSON.parse(bill.issue_categories);
      if (Array.isArray(issues) && issues.length > 0) {
        parts.push(`Issue Categories: ${issues.join(', ')}`);
      }
    } catch {}
  }
  if (bill.policy_area || bill.ai_policy_area || bill.issue_categories) {
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
        AND congress IN (118, 119)
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
        content,
        metadata: {
          congress: bill.congress,
          bill_type: bill.bill_type,
          bill_number: bill.bill_number,
          title: bill.title,
          sponsor_name: bill.sponsor_name,
          status: bill.status,
          policy_area: bill.policy_area || bill.ai_policy_area,
          introduced_date: bill.introduced_date,
          latest_action_date: bill.latest_action_date,
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to index ${bill.id}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ Error indexing ${bill.id}:`, error);
    return false;
  }
}

/**
 * Main indexing function
 */
async function main() {
  console.log('🚀 SmartBuckets Indexing - Congresses 118 and 119\n');
  console.log('============================================================');

  // Load progress
  const progress = loadProgress();
  let startOffset = 0;
  let totalIndexed = 0;

  if (progress) {
    console.log(`📥 Resuming from last progress:`);
    console.log(`   Last processed: ${progress.lastProcessedId}`);
    console.log(`   Total indexed: ${progress.totalIndexed}`);
    console.log(`   Timestamp: ${progress.timestamp}\n`);
    totalIndexed = progress.totalIndexed;
    // Estimate offset based on progress (rough approximation)
    startOffset = Math.floor(totalIndexed / 100) * 100;
  }

  const BATCH_SIZE = 100;
  let offset = startOffset;
  let batchNumber = Math.floor(offset / BATCH_SIZE) + 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`\n📦 Processing batch ${batchNumber} (offset ${offset})...`);

    // Fetch batch
    const bills = await getBillsWithFullText(BATCH_SIZE, offset);

    if (bills.length === 0) {
      console.log('✅ No more bills to index');
      hasMore = false;
      break;
    }

    console.log(`   Found ${bills.length} bills`);

    // Index each bill
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      const progress = ((i + 1) / bills.length * 100).toFixed(1);

      process.stdout.write(`\r   [${i + 1}/${bills.length}] ${progress}% - ${bill.id}`);

      const success = await indexBillInSmartBucket(bill);

      if (success) {
        totalIndexed++;
        saveProgress(bill.id, totalIndexed);
      }

      // Rate limiting
      await sleep(50);
    }

    console.log(`\n   ✅ Batch ${batchNumber} complete (${totalIndexed} total indexed)`);

    offset += BATCH_SIZE;
    batchNumber++;

    // Check if we got fewer bills than requested (last batch)
    if (bills.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  console.log('\n============================================================');
  console.log(`✅ Indexing complete!`);
  console.log(`   Total bills indexed: ${totalIndexed}`);
  console.log('============================================================\n');
}

main().catch(console.error);
