#!/usr/bin/env tsx
/**
 * Populate Representative Statistics
 *
 * Calculates and populates pre-computed statistics for all representatives.
 * This script:
 * 1. Fetches all representatives from the database
 * 2. For each representative, fetches their bills from Congress.gov API
 * 3. Calculates statistics (total sponsored, co-sponsored, laws passed, active bills, policy areas)
 * 4. Updates the database with the calculated stats
 *
 * Note: This will take 10-15 minutes for all 538 representatives due to API rate limits (1 req/sec)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fetchMemberBills, calculateBillStats } from '../lib/congress/fetch-member-bills';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

// Rate limiting: Congress.gov allows 1 request per second
const RATE_LIMIT_MS = 1100; // 1.1 seconds to be safe

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAllRepresentatives() {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'representatives',
      query: `SELECT bioguide_id, name, party, chamber FROM representatives ORDER BY name`
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch representatives: ${response.statusText}`);
  }

  const data = await response.json();
  return data.rows;
}

async function updateRepresentativeStats(
  bioguideId: string,
  stats: {
    totalSponsored: number;
    totalCosponsored: number;
    lawsPassed: number;
    activeBills: number;
    policyAreas: number;
  }
) {
  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'representatives',
      query: `
        UPDATE representatives
        SET bills_sponsored_total = ${stats.totalSponsored},
            bills_cosponsored_total = ${stats.totalCosponsored},
            bills_laws_passed = ${stats.lawsPassed},
            bills_active = ${stats.activeBills},
            policy_areas_count = ${stats.policyAreas},
            stats_updated_at = CURRENT_TIMESTAMP
        WHERE bioguide_id = '${bioguideId}'
      `
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to update stats for ${bioguideId}: ${response.statusText}`);
  }
}

async function populateStats() {
  try {
    console.log('🚀 Starting stats population for all representatives\n');

    const representatives = await getAllRepresentatives();
    console.log(`📊 Found ${representatives.length} representatives\n`);

    let processed = 0;
    let errors = 0;
    const startTime = Date.now();

    for (const rep of representatives) {
      try {
        processed++;
        const progress = `[${processed}/${representatives.length}]`;

        console.log(`${progress} Processing: ${rep.name} (${rep.bioguide_id})...`);

        // Fetch bills with timeout (30 seconds)
        const { sponsoredBills, cosponsoredBills } = await fetchMemberBills(rep.bioguide_id, {
          limit: 250, // Get full count for accurate stats
          timeout: 30000
        });

        // Calculate stats
        const stats = calculateBillStats(sponsoredBills, cosponsoredBills);

        // Update database
        await updateRepresentativeStats(rep.bioguide_id, stats);

        console.log(`✅ ${rep.name}: ${stats.totalSponsored} sponsored, ${stats.totalCosponsored} co-sponsored, ${stats.lawsPassed} laws`);

        // Rate limiting: wait between requests
        if (processed < representatives.length) {
          await sleep(RATE_LIMIT_MS);
        }

      } catch (error: any) {
        errors++;
        console.error(`❌ Error processing ${rep.name}:`, error.message);
        // Continue with next representative
        await sleep(RATE_LIMIT_MS);
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000 / 60);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Stats population complete!');
    console.log(`📊 Processed: ${processed} representatives`);
    console.log(`✅ Successful: ${processed - errors}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

populateStats();
