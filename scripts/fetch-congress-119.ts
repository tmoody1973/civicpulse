#!/usr/bin/env tsx
/**
 * Fetch 119th Congress Bills
 *
 * Fetches all bills from the 119th Congress including:
 * - Bill metadata
 * - Sponsor information
 * - Cosponsor count
 * - Committee assignments
 * - Full text (if available)
 * - Summaries
 * - Subjects/categories
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY!;
const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;
const CONGRESS = 119;

// Progress tracking
interface Progress {
  lastProcessed: string;
  totalFetched: number;
  timestamp: string;
}

// Bill types to fetch
const BILL_TYPES = ['hr', 's', 'hjres', 'sjres'];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function saveProgress(billId: string, totalFetched: number) {
  try {
    mkdirSync('./progress', { recursive: true });
  } catch {}

  const progress: Progress = {
    lastProcessed: billId,
    totalFetched,
    timestamp: new Date().toISOString()
  };

  writeFileSync('./progress/fetch-119-progress.json', JSON.stringify(progress, null, 2));
}

function loadProgress(): Progress | null {
  try {
    const data = readFileSync('./progress/fetch-119-progress.json', 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function getBillsList(billType: string): Promise<any[]> {
  console.log(`\n📋 Fetching ${billType.toUpperCase()} bill list...`);

  let allBills: any[] = [];
  let offset = 0;
  const limit = 250;

  while (true) {
    const response = await fetch(
      `https://api.congress.gov/v3/bill/${CONGRESS}/${billType}?api_key=${CONGRESS_API_KEY}&limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      console.error(`❌ Failed to fetch bill list: ${response.status}`);
      break;
    }

    const data = await response.json();
    const bills = data.bills || [];

    if (bills.length === 0) break;

    allBills = allBills.concat(bills);
    console.log(`   📥 Fetched ${allBills.length} ${billType.toUpperCase()} bills...`);

    if (!data.pagination?.next) break;

    offset += limit;
    await sleep(1000); // Rate limit
  }

  console.log(`   ✅ Total ${billType.toUpperCase()} bills: ${allBills.length}`);
  return allBills;
}

async function fetchBillDetails(billType: string, billNumber: number) {
  const response = await fetch(
    `https://api.congress.gov/v3/bill/${CONGRESS}/${billType}/${billNumber}?api_key=${CONGRESS_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch bill details: ${response.status}`);
  }

  const data = await response.json();
  return data.bill;
}

async function fetchFullText(billType: string, billNumber: number): Promise<string | null> {
  try {
    // Get text versions list
    const response = await fetch(
      `https://api.congress.gov/v3/bill/${CONGRESS}/${billType}/${billNumber}/text?api_key=${CONGRESS_API_KEY}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const textVersions = data.textVersions || [];

    if (textVersions.length === 0) return null;

    // Get the latest version (usually first in array)
    const latestVersion = textVersions[0];
    const formats = latestVersion.formats || [];

    // Look for formatted text
    const textFormat = formats.find((f: any) => f.type === 'Formatted Text');

    if (!textFormat || !textFormat.url) return null;

    await sleep(1000); // Rate limit

    // Fetch the actual text content
    const textResponse = await fetch(textFormat.url);

    if (!textResponse.ok) return null;

    const fullText = await textResponse.text();

    // Clean HTML tags (basic cleaning)
    const cleanText = fullText
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleanText.substring(0, 50000); // Limit to 50KB

  } catch (error) {
    return null;
  }
}

async function fetchCosponsors(billType: string, billNumber: number): Promise<number> {
  try {
    const response = await fetch(
      `https://api.congress.gov/v3/bill/${CONGRESS}/${billType}/${billNumber}/cosponsors?api_key=${CONGRESS_API_KEY}&limit=1`
    );

    if (!response.ok) return 0;

    const data = await response.json();
    return data.pagination?.count || 0;

  } catch (error) {
    return 0;
  }
}

async function fetchCommittees(billType: string, billNumber: number): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.congress.gov/v3/bill/${CONGRESS}/${billType}/${billNumber}/committees?api_key=${CONGRESS_API_KEY}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    const committees = data.committees || [];

    return committees.map((c: any) =>
      c.chamber ? `${c.chamber} - ${c.name}` : c.name
    );

  } catch (error) {
    return [];
  }
}

function determineStatus(bill: any): string {
  // Simple status determination
  // Can be enhanced based on bill actions

  if (bill.laws && bill.laws.length > 0) {
    return 'enacted';
  }

  const latestAction = bill.latestAction?.text?.toLowerCase() || '';

  if (latestAction.includes('became public law') || latestAction.includes('became private law')) {
    return 'enacted';
  }

  if (latestAction.includes('passed senate') || latestAction.includes('passed/agreed to in senate')) {
    return 'passed-senate';
  }

  if (latestAction.includes('passed house') || latestAction.includes('passed/agreed to in house')) {
    return 'passed-house';
  }

  if (latestAction.includes('committee') || latestAction.includes('referred to')) {
    return 'committee';
  }

  return 'introduced';
}

function calculateImpactScore(bill: any, cosponsorCount: number): number {
  let score = 0;

  // Base score
  score += 20;

  // Cosponsor count (max 30 points)
  score += Math.min(cosponsorCount / 10, 30);

  // Has summary (indicates CRS analysis)
  if (bill.summaries && bill.summaries.length > 0) {
    score += 15;
  }

  // Has policy area
  if (bill.policyArea) {
    score += 10;
  }

  // Progress in legislative process
  const status = determineStatus(bill);
  if (status === 'enacted') score += 25;
  else if (status === 'passed-senate') score += 20;
  else if (status === 'passed-house') score += 15;
  else if (status === 'committee') score += 5;

  return Math.min(Math.round(score), 100);
}

async function storeBill(billData: any) {
  const billId = `${CONGRESS}-${billData.type}-${billData.number}`;

  try {
    // Use the /api/bills endpoint with camelCase field names
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: billId,
        congress: CONGRESS,
        billType: billData.type,
        billNumber: billData.number,
        title: billData.title,
        summary: billData.summary,
        fullText: billData.full_text,
        sponsorName: billData.sponsor_name,
        sponsorParty: billData.sponsor_party,
        sponsorState: billData.sponsor_state,
        sponsorDistrict: billData.sponsor_district,
        introducedDate: billData.introduced_date,
        latestActionDate: billData.latest_action_date,
        latestActionText: billData.latest_action_text,
        status: billData.status,
        policyArea: billData.policy_area,
        issueCategories: billData.issue_categories,
        impactScore: billData.impact_score,
        cosponsorCount: billData.cosponsor_count,
        committees: billData.committees
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database insert failed: ${response.status} - ${errorText}`);
    }

  } catch (error: any) {
    console.error(`   ❌ Failed to store bill: ${error.message}`);
    throw error;
  }
}

async function fetchAndStoreBill(billType: string, billNumber: number, index: number, total: number) {
  const billId = `${CONGRESS}-${billType}-${billNumber}`;

  console.log(`\n[${index}/${total}] ${billType.toUpperCase()} ${billNumber}`);

  try {
    // 1. Fetch bill details
    console.log('   📥 Fetching bill details...');
    const bill = await fetchBillDetails(billType, billNumber);
    await sleep(1000);

    // 2. Fetch cosponsor count
    console.log('   📥 Fetching cosponsors...');
    const cosponsorCount = await fetchCosponsors(billType, billNumber);
    console.log(`      ✅ ${cosponsorCount} cosponsors`);
    await sleep(1000);

    // 3. Fetch committees
    console.log('   📥 Fetching committees...');
    const committees = await fetchCommittees(billType, billNumber);
    console.log(`      ✅ ${committees.length} committees`);
    await sleep(1000);

    // 4. Fetch full text (if available)
    console.log('   📥 Fetching full text...');
    const fullText = await fetchFullText(billType, billNumber);

    if (fullText) {
      console.log(`      ✅ Full text (${fullText.length} chars)`);
    } else {
      console.log('      ⚠️  Full text not available');
    }

    // 5. Prepare bill data
    const sponsor = bill.sponsors?.[0] || {};
    const summary = bill.summaries?.[0]?.text || null;
    const subjects = bill.subjects?.legislativeSubjects?.map((s: any) => s.name) || [];
    const policyArea = bill.policyArea?.name || null;
    const status = determineStatus(bill);
    const impactScore = calculateImpactScore(bill, cosponsorCount);

    const billData = {
      type: billType,
      number: billNumber,
      title: bill.title,
      summary,
      sponsor_name: sponsor.fullName || null,
      sponsor_party: sponsor.party || null,
      sponsor_state: sponsor.state || null,
      sponsor_district: sponsor.district || null,
      introduced_date: bill.introducedDate || null,
      latest_action_date: bill.latestAction?.actionDate || null,
      latest_action_text: bill.latestAction?.text || null,
      status,
      policy_area: policyArea,
      issue_categories: subjects,
      full_text: fullText,
      cosponsor_count: cosponsorCount,
      committees,
      impact_score: impactScore
    };

    // 6. Store in database
    console.log('   💾 Storing in database...');
    await storeBill(billData);
    console.log('   ✅ Stored successfully');

    return true;

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting 119th Congress Bill Fetch\n');
  console.log('='.repeat(60));
  console.log('Target: All bills from 119th Congress (2025-2026)');
  console.log('Bill types: HR, S, HJRES, SJRES');
  console.log('Rate limit: 1 request/second');
  console.log('='.repeat(60));

  // Check for previous progress
  const previousProgress = loadProgress();

  if (previousProgress) {
    console.log(`\n⏮️  Found previous progress:`);
    console.log(`   Last processed: ${previousProgress.lastProcessed}`);
    console.log(`   Total fetched: ${previousProgress.totalFetched}`);
    console.log(`   Timestamp: ${previousProgress.timestamp}`);
    console.log('\n   Resuming from where we left off...\n');
  }

  let totalFetched = previousProgress?.totalFetched || 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  // Fetch bills for each type
  for (const billType of BILL_TYPES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Processing ${billType.toUpperCase()} Bills`);
    console.log('='.repeat(60));

    // Get list of bills
    const billsList = await getBillsList(billType);

    if (billsList.length === 0) {
      console.log(`\n⚠️  No ${billType.toUpperCase()} bills found. Skipping...`);
      continue;
    }

    // Check if we should skip based on previous progress
    let startIndex = 0;
    if (previousProgress) {
      const lastBillType = previousProgress.lastProcessed.split('-')[1];
      const lastBillNumber = parseInt(previousProgress.lastProcessed.split('-')[2]);

      if (billType === lastBillType) {
        startIndex = billsList.findIndex(b => b.number === lastBillNumber.toString()) + 1;

        if (startIndex > 0) {
          console.log(`\n⏭️  Skipping first ${startIndex} bills (already processed)`);
          totalSkipped += startIndex;
        }
      } else if (BILL_TYPES.indexOf(billType) < BILL_TYPES.indexOf(lastBillType)) {
        console.log(`\n⏭️  Skipping ${billType.toUpperCase()} (already processed)`);
        totalSkipped += billsList.length;
        continue;
      }
    }

    // Process each bill
    for (let i = startIndex; i < billsList.length; i++) {
      const bill = billsList[i];
      const billNumber = parseInt(bill.number);
      const success = await fetchAndStoreBill(billType, billNumber, i + 1, billsList.length);

      if (success) {
        totalFetched++;
        saveProgress(`${CONGRESS}-${billType}-${billNumber}`, totalFetched);
      } else {
        totalFailed++;
      }

      // Progress update every 10 bills
      if ((i + 1) % 10 === 0) {
        console.log(`\n   📊 Progress: ${i + 1}/${billsList.length} (${Math.round((i + 1) / billsList.length * 100)}%)`);
        console.log(`   ⏱️  Estimated time remaining: ${Math.round((billsList.length - i - 1) * 4 / 60)} minutes\n`);
      }
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ 119th Congress Bill Fetch Complete!');
  console.log('='.repeat(60));
  console.log(`📊 Final Statistics:`);
  console.log(`   Total fetched: ${totalFetched}`);
  console.log(`   Total skipped: ${totalSkipped}`);
  console.log(`   Total failed: ${totalFailed}`);
  console.log(`   Success rate: ${Math.round(totalFetched / (totalFetched + totalFailed) * 100)}%`);
  console.log('='.repeat(60));
  console.log('\n✅ Ready for next steps:');
  console.log('   1. Run AI policy area inference: npx tsx scripts/infer-policy-areas.ts');
  console.log('   2. Index in SmartBuckets: npx tsx scripts/index-smartbuckets-119.ts');
  console.log('   3. Sync to Algolia: npx tsx scripts/sync-algolia-simple.ts');
  console.log();
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
