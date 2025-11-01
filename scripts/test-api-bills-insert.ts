#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function testInsert() {
  console.log('Testing /api/bills POST endpoint...\n');
  
  const testBill = {
    id: '119-hr-99999',
    congress: 119,
    billType: 'hr',
    billNumber: 99999,
    title: 'Test Bill for API',
    summary: 'This is a test bill',
    fullText: 'Full text goes here',
    sponsorName: 'Rep. Test [D-CA-1]',
    sponsorParty: 'D',
    sponsorState: 'CA',
    sponsorDistrict: '1',
    introducedDate: '2025-01-01',
    latestActionDate: '2025-01-02',
    latestActionText: 'Referred to committee',
    status: 'introduced',
    policyArea: 'Test Policy',
    issueCategories: ['test', 'api'],
    impactScore: 50,
    cosponsorCount: 10,
    committees: ['House Committee on Testing']
  };
  
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testBill)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Insert failed: ${response.status}`);
    console.error('Error:', errorText);
    return;
  }
  
  const result = await response.json();
  console.log('✅ Insert successful!');
  console.log('Response:', result);
  
  // Verify
  console.log('\n2. Verifying...');
  const verifyResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/bills?limit=5`);
  const bills = await verifyResponse.json();
  const foundBill = bills.find((b: any) => b.id === testBill.id);
  
  if (foundBill) {
    console.log('✅ Bill found in database!');
    console.log('Bill:', foundBill);
  } else {
    console.error('❌ Bill not found in database');
  }
}

testInsert().catch(console.error);
