#!/usr/bin/env tsx
/**
 * AI Policy Area Inference Script (Cerebras Version)
 *
 * Uses Cerebras (fast, cheap inference) to infer policy areas for bills.
 * Much faster and cheaper than Claude for bulk classification tasks.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY!;

// Official Congress.gov policy areas
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
      // Use first 2000 chars of full text
      context += `\nFull Text (excerpt): ${bill.full_text.substring(0, 2000)}`;
    } else if (bill.summary) {
      context += `\nSummary: ${bill.summary.substring(0, 500)}`;
    }

    const prompt = `You are a legislative analyst. Classify this bill into ONE of the following official Congressional policy areas:

${POLICY_AREAS.join('\n')}

${context}

Respond with ONLY the policy area name from the list above, nothing else.`;

    // Call Cerebras API (OpenAI-compatible endpoint)
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3.1-8b', // Fast, good quality model
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Low temperature for consistent classification
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cerebras API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const policyArea = data.choices?.[0]?.message?.content?.trim();

    if (!policyArea) {
      throw new Error('No content in Cerebras response');
    }

    // Validate it's one of our known policy areas
    if (POLICY_AREAS.includes(policyArea)) {
      return policyArea;
    } else {
      console.warn(`  ⚠️  Unexpected policy area: "${policyArea}"`);
      return null;
    }

  } catch (error: any) {
    console.error(`  ❌ Cerebras API error: ${error.message}`);
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
  if (!CEREBRAS_API_KEY) {
    console.error('❌ CEREBRAS_API_KEY not found in environment variables');
    console.error('Please add CEREBRAS_API_KEY to your .env.local file');
    process.exit(1);
  }

  const shouldLimit = process.argv.includes('--limit');
  const limitCount = shouldLimit ? parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : null;

  console.log('\n🚀 AI Policy Area Inference (Cerebras)\n');
  console.log('=' .repeat(60));
  console.log('Using Cerebras llama3.1-8b for fast classification');
  console.log('Benefits: 20x faster, 90% cheaper than Claude');
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
  const startTime = Date.now();

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

      // Very short rate limit (Cerebras is fast!)
      if (i < billsToProcess.length - 1) {
        await sleep(100); // 0.1 seconds between requests
      }

    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  const endTime = Date.now();
  const totalTimeSeconds = Math.round((endTime - startTime) / 1000);
  const totalTimeMinutes = Math.floor(totalTimeSeconds / 60);
  const remainingSeconds = totalTimeSeconds % 60;

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ AI Inference Complete!');
  console.log('='.repeat(60));
  console.log(`📊 Total processed: ${billsToProcess.length}`);
  console.log(`✅ Successfully inferred: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('='.repeat(60));
  console.log();

  if (totalTimeMinutes > 0) {
    console.log(`⏱️  Total time: ${totalTimeMinutes} minutes ${remainingSeconds} seconds`);
  } else {
    console.log(`⏱️  Total time: ${totalTimeSeconds} seconds`);
  }

  console.log(`⚡ Average: ${Math.round((totalTimeSeconds * 1000) / billsToProcess.length)}ms per bill`);
  console.log();

  if (!limitCount && bills.length > billsToProcess.length) {
    const remaining = bills.length - billsToProcess.length;
    console.log(`⚠️  Note: ${remaining} bills remaining. Run without --limit to process all.`);
  }

  if (errorCount > 0) {
    console.log(`\n💡 Tip: Errors may be due to missing bill text/summaries or API rate limits.`);
  }
}

main().catch(console.error);
