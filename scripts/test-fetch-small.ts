#!/usr/bin/env tsx
/**
 * Test fetch with just 5 bills to verify it works
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY!;
const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;
const CONGRESS = 119;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBillDetails(billType: string, billNumber: number) {
  const response = await fetch(
    `https://api.congress.gov/v3/bill/${CONGRESS}/${billType}/${billNumber}?api_key=${CONGRESS_API_KEY}`
  );
  
  if (!response.ok) throw new Error(`Failed to fetch bill details: ${response.status}`);
  
  const data = await response.json();
  return data.bill;
}

async function storeBill(billData: any) {
  const billId = `${CONGRESS}-${billData.type}-${billData.number}`;

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
}

async function testFetch() {
  console.log('🧪 Testing fetch with 5 bills...\n');
  
  const testBills = [
    { type: 'hr', number: 1 },
    { type: 'hr', number: 2 },
    { type: 'hr', number: 3 },
    { type: 's', number: 1 },
    { type: 's', number: 2 }
  ];
  
  let success = 0;
  let failed = 0;
  
  for (const { type, number } of testBills) {
    try {
      console.log(`Fetching ${type.toUpperCase()} ${number}...`);
      const bill = await fetchBillDetails(type, number);
      await sleep(1000);
      
      const sponsor = bill.sponsors?.[0] || {};
      const billData = {
        type,
        number,
        title: bill.title,
        summary: bill.summaries?.[0]?.text || null,
        full_text: null,
        sponsor_name: sponsor.fullName || null,
        sponsor_party: sponsor.party || null,
        sponsor_state: sponsor.state || null,
        sponsor_district: sponsor.district || null,
        introduced_date: bill.introducedDate || null,
        latest_action_date: bill.latestAction?.actionDate || null,
        latest_action_text: bill.latestAction?.text || null,
        status: 'introduced',
        policy_area: bill.policyArea?.name || null,
        issue_categories: bill.subjects?.legislativeSubjects?.map((s: any) => s.name) || [],
        impact_score: 50,
        cosponsor_count: 0,
        committees: []
      };
      
      await storeBill(billData);
      console.log(`✅ Stored ${type.toUpperCase()} ${number}`);
      success++;
      
    } catch (error: any) {
      console.error(`❌ Failed ${type.toUpperCase()} ${number}:`, error.message);
      failed++;
    }
  }
  
  console.log(`\n✨ Test complete! Success: ${success}, Failed: ${failed}`);
}

testFetch().catch(console.error);
