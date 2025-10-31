#!/usr/bin/env tsx
/**
 * Populate Subjects for Existing Bills
 *
 * Fetches policy area and legislative subjects from Congress.gov
 * for all bills in the database and updates them.
 *
 * Rate limit: 1 request per second (Congress.gov API)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fetchBillSubjects } from '../lib/api/congress';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

interface Bill {
  id: string;
  congress: number;
  bill_type: string;
  bill_number: number;
  title: string;
}

/**
 * Sleep for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch all bills from database
 */
async function fetchAllBills(): Promise<Bill[]> {
  console.log('📥 Fetching bills from database...');

  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'SELECT id, congress, bill_type, bill_number, title FROM bills ORDER BY latest_action_date DESC'
    })
  });

  const data = await response.json();
  console.log(`✅ Found ${data.rows?.length || 0} bills\n`);

  return data.rows || [];
}

/**
 * Update bill with subjects in database
 */
async function updateBillSubjects(
  billId: string,
  policyArea: string | null,
  legislativeSubjects: string[]
): Promise<void> {
  const issueCategories = JSON.stringify(legislativeSubjects);

  const query = `
    UPDATE bills
    SET policy_area = ${policyArea ? `'${policyArea.replace(/'/g, "''")}'` : 'NULL'},
        issue_categories = '${issueCategories.replace(/'/g, "''")}'
    WHERE id = '${billId}'
  `;

  await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query
    })
  });
}

/**
 * Main execution
 */
async function main() {
  const shouldLimit = process.argv.includes('--limit');
  const limitCount = shouldLimit ? parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : null;

  console.log('\n🚀 Starting Subject Population\n');
  console.log('=' .repeat(60));
  console.log(`Rate limit: 1 request/second (Congress.gov API)`);
  if (limitCount) {
    console.log(`Processing limit: ${limitCount} bills`);
  }
  console.log('=' .repeat(60));
  console.log();

  // Fetch all bills
  const bills = await fetchAllBills();

  const billsToProcess = limitCount ? bills.slice(0, limitCount) : bills;
  console.log(`📊 Processing ${billsToProcess.length} bills...\n`);

  let successCount = 0;
  let errorCount = 0;
  let noSubjectsCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < billsToProcess.length; i++) {
    const bill = billsToProcess[i];
    const progress = `[${i + 1}/${billsToProcess.length}]`;

    try {
      console.log(`${progress} Fetching subjects for ${bill.bill_type.toUpperCase()} ${bill.bill_number}...`);

      // Fetch subjects from Congress.gov
      const subjects = await fetchBillSubjects(bill.congress, bill.bill_type, bill.bill_number);

      if (!subjects) {
        console.log(`  ⚠️  No subjects found (404 or error)`);
        noSubjectsCount++;
      } else if (!subjects.policyArea && subjects.legislativeSubjects.length === 0) {
        console.log(`  ℹ️   No subjects assigned yet`);
        noSubjectsCount++;
      } else {
        // Update database
        await updateBillSubjects(bill.id, subjects.policyArea, subjects.legislativeSubjects);

        console.log(`  ✅ Policy Area: ${subjects.policyArea || 'None'}`);
        console.log(`  ✅ Subjects: ${subjects.legislativeSubjects.length} (${subjects.legislativeSubjects.slice(0, 2).join(', ')}${subjects.legislativeSubjects.length > 2 ? '...' : ''})`);

        successCount++;
      }

      // Rate limit: 1 request per second
      if (i < billsToProcess.length - 1) {
        await sleep(1100); // 1.1 seconds to be safe
      }

    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      errorCount++;

      // Still wait for rate limit
      if (i < billsToProcess.length - 1) {
        await sleep(1100);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ Subject Population Complete!');
  console.log('='.repeat(60));
  console.log(`📊 Total processed: ${billsToProcess.length}`);
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`ℹ️  No subjects found: ${noSubjectsCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log('='.repeat(60));
  console.log();

  const totalTime = Math.round((billsToProcess.length * 1.1) / 60);
  console.log(`⏱️  Estimated time: ${totalTime} minutes`);
  console.log();

  if (limitCount && limitCount < bills.length) {
    const remaining = bills.length - limitCount;
    console.log(`⚠️  Note: ${remaining} bills remaining. Run without --limit to process all.`);
    console.log();
  }
}

main().catch(error => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});
