#!/usr/bin/env tsx
/**
 * Simple Algolia Sync Script
 * 
 * Syncs bills from Raindrop database to Algolia search index
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { algoliasearch } from 'algoliasearch';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY!;
const INDEX_NAME = 'bills';

interface AlgoliaRecord {
  objectID: string;
  billNumber: string;
  congress: number;
  billType: string;
  title: string;
  summary: string | null;
  sponsorName: string | null;
  sponsorParty: string | null;
  sponsorState: string | null;
  introducedDate: string | null;
  latestActionDate: string | null;
  latestActionText: string | null;
  status: string;
  issueCategories: string[];
  impactScore: number;
  hasFullText: boolean;
  url: string;
  _timestamp: number;
}

async function fetchBillsFromDatabase(): Promise<any[]> {
  console.log('📥 Fetching bills from Raindrop database...');
  
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'SELECT * FROM bills ORDER BY latest_action_date DESC'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bills: ${response.status}`);
  }

  const data = await response.json();
  return data.rows || [];
}

function transformToAlgoliaRecord(bill: any): AlgoliaRecord {
  return {
    objectID: bill.id,
    billNumber: `${bill.bill_type.toUpperCase()} ${bill.bill_number}`,
    congress: bill.congress,
    billType: bill.bill_type,
    title: bill.title || '',
    summary: bill.summary,
    sponsorName: bill.sponsor_name,
    sponsorParty: bill.sponsor_party,
    sponsorState: bill.sponsor_state,
    introducedDate: bill.introduced_date,
    latestActionDate: bill.latest_action_date,
    latestActionText: bill.latest_action_text,
    status: bill.status || 'introduced',
    issueCategories: bill.issue_categories ? JSON.parse(bill.issue_categories) : [],
    impactScore: bill.impact_score || 0,
    hasFullText: !!bill.full_text,
    url: `/bills/${bill.id}`,
    _timestamp: bill.latest_action_date 
      ? new Date(bill.latest_action_date).getTime()
      : Date.now()
  };
}

async function main() {
  const shouldClear = process.argv.includes('--clear');
  
  console.log('\n🚀 Starting Algolia Sync\n');
  console.log(`App ID: ${ALGOLIA_APP_ID}`);
  console.log(`Index: ${INDEX_NAME}`);
  console.log(`Clear first: ${shouldClear}\n`);
  
  // Initialize Algolia (v5 API)
  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
  
  // Clear if requested
  if (shouldClear) {
    console.log('🗑️  Clearing index...');
    await client.clearObjects({ indexName: INDEX_NAME });
    console.log('✅ Index cleared\n');
  }
  
  // Configure index
  console.log('⚙️  Configuring index...');
  await client.setSettings({
    indexName: INDEX_NAME,
    indexSettings: {
      searchableAttributes: [
        'billNumber',
        'title',
        'summary',
        'sponsorName',
        'issueCategories'
      ],
      attributesForFaceting: [
        'searchable(billType)',
        'searchable(status)',
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
      hitsPerPage: 20
    }
  });
  console.log('✅ Index configured\n');
  
  // Fetch bills
  const bills = await fetchBillsFromDatabase();
  console.log(`✅ Fetched ${bills.length} bills\n`);
  
  // Transform
  console.log('🔄 Transforming records...');
  const records = bills.map(transformToAlgoliaRecord);
  console.log(`✅ Transformed ${records.length} records\n`);
  
  // Upload to Algolia
  console.log('📤 Uploading to Algolia...');
  await client.saveObjects({ indexName: INDEX_NAME, objects: records });
  console.log(`✅ Uploaded ${records.length} records\n`);
  
  console.log('='.repeat(60));
  console.log('✨ Algolia sync complete!');
  console.log('='.repeat(60));
  console.log(`📊 Total synced: ${records.length} bills`);
  console.log(`🔗 Dashboard: https://www.algolia.com/apps/${ALGOLIA_APP_ID}/explorer/browse/${INDEX_NAME}`);
  console.log('='.repeat(60));
  console.log();
}

main().catch(error => {
  console.error('\n❌ Sync failed:', error);
  process.exit(1);
});
