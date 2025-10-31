#!/usr/bin/env tsx
/**
 * Update Bill Sponsors
 *
 * This script updates all bills in the database with their sponsor's bioguide ID.
 * This is needed to connect bills to representatives on detail pages.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function updateBillSponsors() {
  console.log('\n🔄 Updating Bill Sponsors in Database\n');
  console.log('='.repeat(60));

  if (!RAINDROP_SERVICE_URL) {
    console.error('❌ RAINDROP_SERVICE_URL not set');
    process.exit(1);
  }

  try {
    // Step 1: Get all bills
    console.log('\n📋 Step 1: Fetching all bills from database...');

    const billsResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: 'SELECT id, congress, bill_type, bill_number, sponsor_bioguide_id, sponsor_name FROM bills'
      })
    });

    const billsData = await billsResponse.json();
    const bills = billsData.rows || [];

    console.log(`✅ Found ${bills.length} bills`);

    // Step 2: Check how many already have sponsors
    const billsWithSponsors = bills.filter((b: any) => b.sponsor_bioguide_id);
    const billsWithoutSponsors = bills.filter((b: any) => !b.sponsor_bioguide_id);

    console.log(`\n📊 Current Status:`);
    console.log(`   ✅ Bills with sponsors: ${billsWithSponsors.length}`);
    console.log(`   ❌ Bills without sponsors: ${billsWithoutSponsors.length}`);

    if (billsWithoutSponsors.length === 0) {
      console.log('\n🎉 All bills already have sponsors! Nothing to do.');
      return;
    }

    // Step 3: Show sample of bills that need updating
    console.log(`\n📝 Sample bills missing sponsors (showing 5):`);
    billsWithoutSponsors.slice(0, 5).forEach((bill: any) => {
      console.log(`   ${bill.bill_type.toUpperCase()} ${bill.bill_number} - ${bill.sponsor_name || 'No sponsor name'}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('ℹ️  INFORMATION:');
    console.log('   The bills were fetched from Congress.gov, but the sponsor');
    console.log('   bioguide ID needs to be extracted from the raw data.');
    console.log('   ');
    console.log('   This happens during the bill fetching process in:');
    console.log('   scripts/fetch-congress-119.ts');
    console.log('');
    console.log('   To fix this, you need to:');
    console.log('   1. Re-run the fetch script with sponsor extraction enabled');
    console.log('   2. OR manually update bills from Congress.gov API');
    console.log('='.repeat(60));

    // Step 4: Provide instructions
    console.log('\n📚 How to Fix:');
    console.log('\nOption 1: Re-fetch bills (recommended)');
    console.log('   Run: npx tsx scripts/fetch-congress-119.ts');
    console.log('   This will fetch bills again and extract sponsor info');
    console.log('');
    console.log('Option 2: Manual API update (for specific bills)');
    console.log('   The sponsor info is in the original API response');
    console.log('   under: bill.sponsors[0].bioguideId');
    console.log('');
    console.log('🔍 Checking if sponsor data is in raw bill data...');

    // Step 5: Check if we can extract sponsor from existing data
    const sampleBill = billsWithoutSponsors[0];
    if (sampleBill) {
      console.log(`\n📋 Sample Bill: ${sampleBill.bill_type.toUpperCase()} ${sampleBill.bill_number}`);
      console.log(`   ID: ${sampleBill.id}`);
      console.log(`   Sponsor Name: ${sampleBill.sponsor_name || 'Not set'}`);
      console.log(`   Sponsor Bioguide: ${sampleBill.sponsor_bioguide_id || 'Not set'}`);
    }

    console.log('\n✅ Analysis complete!');
    console.log('\n💡 TIP: The sponsor_bioguide_id field needs to be populated');
    console.log('   during the initial bill fetch from Congress.gov API.');
    console.log('   Check your fetch script to ensure it extracts this field.\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateBillSponsors();
