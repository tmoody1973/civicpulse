#!/usr/bin/env tsx
/**
 * Populate Sponsor Bioguide IDs
 *
 * Matches bills to representatives by name and populates sponsor_bioguide_id
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

interface Representative {
  bioguide_id: string;
  name: string;
}

interface Bill {
  id: string;
  sponsor_name: string | null;
  sponsor_bioguide_id: string | null;
}

async function getAllRepresentatives(): Promise<Representative[]> {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'representatives',
      query: 'SELECT bioguide_id, name FROM representatives'
    })
  });

  const data = await response.json();
  return data.rows || [];
}

async function getBillsWithoutBioguideId(): Promise<Bill[]> {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'SELECT id, sponsor_name, sponsor_bioguide_id FROM bills WHERE sponsor_name IS NOT NULL'
    })
  });

  const data = await response.json();
  return data.rows || [];
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\./g, '')
    .trim();
}

function extractNameParts(sponsorName: string): { lastName: string; firstName: string } | null {
  // Format: "Rep. Matsui, Doris O. [D-CA-7]" or "Sen. Schatz, Brian [D-HI]"
  // Remove title and party info
  const cleaned = sponsorName
    .replace(/^(Rep\.|Sen\.)\s+/, '')
    .replace(/\s*\[.*\]$/, '')
    .trim();

  // Split by comma: "Matsui, Doris O." -> ["Matsui", "Doris O."]
  const parts = cleaned.split(',').map(p => p.trim());

  if (parts.length >= 2) {
    const lastName = parts[0];
    const firstName = parts[1].split(' ')[0]; // Get first word of first name (handles middle names/initials)
    return { lastName, firstName };
  }

  return null;
}

function findMatchingRepresentative(
  sponsorName: string,
  representatives: Representative[]
): Representative | null {
  const nameParts = extractNameParts(sponsorName);
  if (!nameParts) return null;

  const { lastName, firstName } = nameParts;

  // Strategy 1: Exact match on "LastName, FirstName" format
  const exactMatch = representatives.find(rep => {
    const repNormalized = normalizeName(rep.name);
    const sponsorNormalized = normalizeName(`${lastName}, ${firstName}`);
    return repNormalized === sponsorNormalized ||
           repNormalized.startsWith(sponsorNormalized);
  });

  if (exactMatch) return exactMatch;

  // Strategy 2: Match on last name and first name (case-insensitive, flexible)
  const flexibleMatches = representatives.filter(rep => {
    const repLower = rep.name.toLowerCase();
    const lastNameLower = lastName.toLowerCase();
    const firstNameLower = firstName.toLowerCase();

    // Check if representative name contains both last and first name
    return repLower.includes(lastNameLower) && repLower.includes(firstNameLower);
  });

  if (flexibleMatches.length === 1) {
    return flexibleMatches[0];
  }

  // Strategy 3: If multiple matches, try to find exact last name match at start
  if (flexibleMatches.length > 1) {
    const exactLastName = flexibleMatches.find(rep =>
      rep.name.toLowerCase().startsWith(lastName.toLowerCase() + ',')
    );
    if (exactLastName) return exactLastName;
  }

  // Strategy 4: Last resort - match on last name only if unique
  const lastNameMatches = representatives.filter(rep =>
    rep.name.toLowerCase().includes(lastName.toLowerCase())
  );

  if (lastNameMatches.length === 1) {
    return lastNameMatches[0];
  }

  return null;
}

async function updateBillSponsorBioguideId(billId: string, bioguideId: string): Promise<void> {
  await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `UPDATE bills SET sponsor_bioguide_id = '${bioguideId}' WHERE id = '${billId}'`
    })
  });
}

async function main() {
  console.log('\n🚀 Starting sponsor bioguide ID population\n');

  // Get all representatives
  console.log('📥 Fetching representatives...');
  const representatives = await getAllRepresentatives();
  console.log(`✅ Loaded ${representatives.length} representatives\n`);

  // Get all bills
  console.log('📥 Fetching bills...');
  const bills = await getBillsWithoutBioguideId();
  console.log(`✅ Loaded ${bills.length} bills\n`);

  let matched = 0;
  let unmatched = 0;
  let updated = 0;
  let skipped = 0;

  console.log('🔄 Matching bills to representatives...\n');

  for (const bill of bills) {
    if (!bill.sponsor_name) {
      skipped++;
      continue;
    }

    // Skip if already has bioguide_id
    if (bill.sponsor_bioguide_id) {
      skipped++;
      continue;
    }

    const representative = findMatchingRepresentative(bill.sponsor_name, representatives);

    if (representative) {
      await updateBillSponsorBioguideId(bill.id, representative.bioguide_id);
      matched++;
      updated++;

      if (updated % 100 === 0) {
        console.log(`✅ Updated ${updated} bills...`);
      }
    } else {
      unmatched++;
      if (unmatched <= 10) {
        console.log(`❌ No match for: ${bill.sponsor_name}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Sponsor bioguide ID population complete!');
  console.log('='.repeat(60));
  console.log(`📊 Total bills: ${bills.length}`);
  console.log(`✅ Matched: ${matched}`);
  console.log(`📝 Updated: ${updated}`);
  console.log(`⏭️  Skipped (already had bioguide_id): ${skipped}`);
  console.log(`❌ Unmatched: ${unmatched}`);
  console.log('='.repeat(60));
  console.log();
}

main().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
