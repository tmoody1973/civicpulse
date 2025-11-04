#!/usr/bin/env tsx
/**
 * Simple Algolia Sync Script with Progress Tracking
 *
 * Syncs bills from Raindrop database to Algolia search index
 * Supports resuming from last checkpoint
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { algoliasearch } from 'algoliasearch';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY!;
const INDEX_NAME = 'bills';

interface Progress {
  lastProcessedId: string;
  totalIndexed: number;
  timestamp: string;
}

interface AlgoliaRecord {
  objectID: string;
  billNumber: string;
  congress: number;
  billType: string;
  title: string;
  summary: string | null;
  sponsorName: string | null;
  sponsorBioguideId: string | null;
  sponsorParty: string | null;
  sponsorState: string | null;
  sponsorDistrict: string | null;
  introducedDate: string | null;
  cosponsorCount: number;
  committees: string[];
  latestActionDate: string | null;
  latestActionText: string | null;
  status: string;
  policyArea: string | null;
  issueCategories: string[];
  impactScore: number;
  hasFullText: boolean;
  url: string;
  _timestamp: number;
  [key: string]: unknown;  // Index signature for Algolia compatibility
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

  writeFileSync('./progress/algolia-progress.json', JSON.stringify(progress, null, 2));
}

function loadProgress(): Progress | null {
  try {
    const data = readFileSync('./progress/algolia-progress.json', 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBillsFromDatabase(limit: number = 100, offset: number = 0): Promise<any[]> {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `SELECT * FROM bills ORDER BY id LIMIT ${limit} OFFSET ${offset}`
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bills: ${response.status}`);
  }

  const data = await response.json();
  return data.rows || [];
}

function transformToAlgoliaRecord(bill: any): AlgoliaRecord {
  // Use official policy_area if available, otherwise fallback to AI-inferred
  const policyArea = bill.policy_area || bill.ai_policy_area || null;

  // CRITICAL: Truncate large fields to stay under Algolia's 10KB record limit
  // Total record size must be < 10KB, so we're conservative with truncation
  const truncateSafely = (text: string | null, maxLength: number): string | null => {
    if (!text) return null;
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const title = truncateSafely(bill.title || '', 500) || '';
  const summary = truncateSafely(bill.summary, 3000);
  const latestActionText = truncateSafely(bill.latest_action_text, 500);

  // Parse arrays safely and limit size
  let issueCategories: string[] = [];
  try {
    if (bill.issue_categories) {
      const parsed = JSON.parse(bill.issue_categories);
      issueCategories = Array.isArray(parsed) ? parsed.slice(0, 10) : []; // Max 10 categories
    }
  } catch {}

  let committees: string[] = [];
  try {
    if (bill.committees) {
      const parsed = JSON.parse(bill.committees);
      committees = Array.isArray(parsed) ? parsed.slice(0, 5) : []; // Max 5 committees
    }
  } catch {}

  return {
    objectID: bill.id,
    billNumber: `${bill.bill_type.toUpperCase()} ${bill.bill_number}`,
    congress: bill.congress,
    billType: bill.bill_type,
    title,
    summary,
    sponsorName: bill.sponsor_name,
    sponsorBioguideId: bill.sponsor_bioguide_id || null,
    sponsorParty: bill.sponsor_party,
    sponsorState: bill.sponsor_state,
    sponsorDistrict: bill.sponsor_district || null,
    introducedDate: bill.introduced_date,
    latestActionDate: bill.latest_action_date,
    latestActionText,
    status: bill.status || 'introduced',
    policyArea: policyArea,  // Official or AI-inferred policy area
    issueCategories,
    impactScore: bill.impact_score || 0,
    cosponsorCount: bill.cosponsor_count || 0,
    committees,
    hasFullText: !!bill.full_text,
    url: `/bills/${bill.id}`,
    _timestamp: bill.latest_action_date
      ? new Date(bill.latest_action_date).getTime()
      : Date.now()
  };
}

async function main() {
  const shouldClear = process.argv.includes('--clear');

  console.log('\n🚀 Starting Algolia Sync with Progress Tracking\n');
  console.log('='.repeat(60));
  console.log(`App ID: ${ALGOLIA_APP_ID}`);
  console.log(`Index: ${INDEX_NAME}`);
  console.log(`Clear first: ${shouldClear}`);
  console.log('='.repeat(60));

  // Initialize Algolia (v5 API)
  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

  // Clear if requested
  if (shouldClear) {
    console.log('\n🗑️  Clearing index...');
    await client.clearObjects({ indexName: INDEX_NAME });
    console.log('✅ Index cleared');
  }

  // Configure index
  console.log('\n⚙️  Configuring index...');
  await client.setSettings({
    indexName: INDEX_NAME,
    indexSettings: {
      searchableAttributes: [
        'billNumber',
        'title',
        'policyArea',
        'summary',
        'sponsorName',
        'issueCategories'
      ],
      attributesForFaceting: [
        'searchable(billType)',
        'searchable(status)',
        'searchable(policyArea)',
        'searchable(sponsorParty)',
        'searchable(sponsorState)',
        'searchable(issueCategories)',
        'congress',
        'hasFullText'
      ],
      customRanking: [
        'desc(impactScore)',
        'desc(_timestamp)'
      ],
      attributesToHighlight: ['title', 'summary'],
      attributesToSnippet: ['summary:50'],
      attributesToRetrieve: [
        'objectID',
        'billNumber',
        'billType',
        'congress',
        'title',
        'summary',
        'sponsorName',
        'sponsorBioguideId',
        'sponsorParty',
        'sponsorState',
        'sponsorDistrict',
        'introducedDate',
        'cosponsorCount',
        'committees',
        'policyArea',
        'issueCategories',
        'status',
        'latestActionText',
        'latestActionDate',
        'impactScore',
        'url'
      ],
      hitsPerPage: 20
    }
  });
  console.log('✅ Index configured');

  // Check for previous progress
  const previousProgress = loadProgress();
  let startOffset = 0;
  let totalIndexed = 0;

  if (previousProgress && !shouldClear) {
    console.log(`\n⏮️  Found previous progress:`);
    console.log(`   Last processed: ${previousProgress.lastProcessedId}`);
    console.log(`   Total indexed: ${previousProgress.totalIndexed}`);
    console.log(`   Timestamp: ${previousProgress.timestamp}`);
    console.log('\n   Resuming from where we left off...');
    startOffset = previousProgress.totalIndexed;
    totalIndexed = previousProgress.totalIndexed;
  }

  const BATCH_SIZE = 100;
  let offset = startOffset;
  let hasMore = true;

  while (hasMore) {
    console.log(`\n📦 Fetching batch (offset: ${offset}, limit: ${BATCH_SIZE})...`);

    const bills = await fetchBillsFromDatabase(BATCH_SIZE, offset);

    if (bills.length === 0) {
      console.log('✅ No more bills to process');
      hasMore = false;
      break;
    }

    console.log(`   Found ${bills.length} bills`);

    // Transform to Algolia records
    const records = bills.map(transformToAlgoliaRecord);

    // Upload batch to Algolia
    console.log(`   📤 Uploading ${records.length} records to Algolia...`);
    await client.saveObjects({ indexName: INDEX_NAME, objects: records });

    totalIndexed += records.length;

    // Save progress after each batch
    if (bills.length > 0) {
      saveProgress(bills[bills.length - 1].id, totalIndexed);
    }

    console.log(`   ✅ Batch complete (${totalIndexed} total indexed)`);

    offset += BATCH_SIZE;

    // Rate limiting
    await sleep(100);

    // If we got fewer bills than requested, we're done
    if (bills.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Algolia sync complete!');
  console.log('='.repeat(60));
  console.log(`📊 Total indexed: ${totalIndexed} bills`);
  console.log(`🔗 Dashboard: https://www.algolia.com/apps/${ALGOLIA_APP_ID}/explorer/browse/${INDEX_NAME}`);
  console.log('='.repeat(60));
  console.log();
}

main().catch(error => {
  console.error('\n❌ Sync failed:', error);
  process.exit(1);
});
