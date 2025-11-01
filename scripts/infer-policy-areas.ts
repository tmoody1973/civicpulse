#!/usr/bin/env tsx
/**
 * AI Policy Area Inference Script
 *
 * Uses Claude to infer policy areas for bills that don't have official ones yet.
 * Stores results in ai_policy_area column for fallback.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import Anthropic from '@anthropic-ai/sdk';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Official Congress.gov policy areas (from our populated bills)
const POLICY_AREAS = [
  'Agriculture and Food',
  'Armed Forces and National Security',
  'Commerce',
  'Congress',
  'Crime and Law Enforcement',
  'Economics and Public Finance',
  'Education',
  'Emergency Management',
  'Government Operations and Politics',
  'Health',
  'Housing',
  'International Affairs',
  'Labor and Employment',
  'Law',
  'Public Lands and Natural Resources',
  'Science, Technology, Communications',
  'Taxation',
  'Transportation and Public Works'
];

interface Bill {
  id: string;
  title: string;
  summary: string | null;
  full_text: string | null;
  bill_type: string;
  bill_number: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBillsWithoutPolicyArea(): Promise<Bill[]> {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'SELECT id, title, summary, full_text, bill_type, bill_number FROM bills WHERE policy_area IS NULL ORDER BY latest_action_date DESC'
    })
  });

  const data = await response.json();
  return data.rows || [];
}

async function inferPolicyArea(bill: Bill): Promise<string | null> {
  try {
    // Build context from available information
    let context = `Bill: ${bill.bill_type.toUpperCase()} ${bill.bill_number}\nTitle: ${bill.title}\n`;

    if (bill.full_text && bill.full_text.length > 100) {
      // Use first 2000 chars of full text (most important content)
      context += `\nFull Text (excerpt): ${bill.full_text.substring(0, 2000)}`;
    } else if (bill.summary) {
      context += `\nSummary: ${bill.summary.substring(0, 500)}`;
    }

    const prompt = `You are a legislative analyst. Classify this bill into ONE of the following official Congressional policy areas:

${POLICY_AREAS.join('\n')}

${context}

Respond with ONLY the policy area name from the list above, nothing else.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }]
    });

    const response = message.content[0];
    if (response.type === 'text') {
      const policyArea = response.text.trim();

      // Validate it's one of our known policy areas
      if (POLICY_AREAS.includes(policyArea)) {
        return policyArea;
      } else {
        console.warn(`  ⚠️  Unexpected policy area: "${policyArea}"`);
        return null;
      }
    }

    return null;
  } catch (error: any) {
    console.error(`  ❌ Claude API error: ${error.message}`);
    return null;
  }
}

async function updateAIPolicyArea(billId: string, aiPolicyArea: string): Promise<void> {
  await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `UPDATE bills SET ai_policy_area = '${aiPolicyArea.replace(/'/g, "''")}' WHERE id = '${billId}'`
    })
  });
}

async function main() {
  const shouldLimit = process.argv.includes('--limit');
  const limitCount = shouldLimit ? parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : null;

  console.log('\n🤖 AI Policy Area Inference\n');
  console.log('=' .repeat(60));
  console.log('Using Claude Sonnet 4 to infer policy areas');
  if (limitCount) {
    console.log(`Processing limit: ${limitCount} bills`);
  }
  console.log('=' .repeat(60));
  console.log();

  // Fetch bills without policy areas
  const bills = await fetchBillsWithoutPolicyArea();
  console.log(`📥 Found ${bills.length} bills without policy areas\n`);

  const billsToProcess = limitCount ? bills.slice(0, limitCount) : bills;
  console.log(`📊 Processing ${billsToProcess.length} bills...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < billsToProcess.length; i++) {
    const bill = billsToProcess[i];
    const progress = `[${i + 1}/${billsToProcess.length}]`;

    console.log(`${progress} ${bill.bill_type.toUpperCase()} ${bill.bill_number}: ${bill.title.substring(0, 60)}...`);

    try {
      const policyArea = await inferPolicyArea(bill);

      if (policyArea) {
        await updateAIPolicyArea(bill.id, policyArea);
        console.log(`  ✅ Inferred: ${policyArea}`);
        successCount++;
      } else {
        console.log(`  ⚠️  Could not infer policy area`);
        errorCount++;
      }

      // Rate limit Claude API (be nice)
      if (i < billsToProcess.length - 1) {
        await sleep(500); // 0.5 seconds between requests
      }

    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ AI Inference Complete!');
  console.log('='.repeat(60));
  console.log(`📊 Total processed: ${billsToProcess.length}`);
  console.log(`✅ Successfully inferred: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('='.repeat(60));
  console.log();

  const totalTime = Math.round((billsToProcess.length * 0.5) / 60);
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
