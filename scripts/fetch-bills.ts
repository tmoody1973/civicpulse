#!/usr/bin/env tsx
/**
 * Automated Bill Fetching Script
 *
 * Fetches bills from Congress.gov API and stores them in the database.
 * Respects the 1 request/second rate limit.
 *
 * Usage:
 *   npm run fetch:bills                    # Fetch current Congress (119)
 *   npm run fetch:bills -- --congress=118  # Fetch specific Congress
 *   npm run fetch:bills -- --all           # Fetch all recent Congresses (115-119)
 *   npm run fetch:bills -- --limit=500     # Limit total bills to fetch
 *   npm run fetch:bills -- --full          # Fetch summaries + full text (SLOW!)
 */

import {
  fetchRecentBills,
  fetchBillSummary,
  fetchBillText,
  fetchBillCosponsors,
  fetchBillActions,
  fetchBillSubjects
} from '../lib/api/congress';

interface FetchOptions {
  congresses: number[];
  batchSize: number;
  maxBillsPerCongress?: number;
  raindropServiceUrl: string;
  fetchFullText: boolean;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate searchable_text from bill data
 */
function generateSearchableText(bill: any): string {
  const parts: string[] = [];

  // Bill number and type
  if (bill.billType && bill.billNumber) {
    parts.push(`${bill.billType.toUpperCase()} ${bill.billNumber}`);
  }

  // Title
  if (bill.title) {
    parts.push(bill.title);
  }

  // Summary
  if (bill.summary) {
    parts.push(bill.summary);
  }

  // Sponsor name
  if (bill.sponsorName) {
    parts.push(bill.sponsorName);
  }

  // Issue categories
  if (bill.issueCategories && Array.isArray(bill.issueCategories)) {
    parts.push(bill.issueCategories.join(' '));
  }

  return parts.join(' ').toLowerCase();
}

/**
 * Store bills in Raindrop database
 */
async function storeBills(bills: any[], raindropServiceUrl: string, fetchFullText: boolean): Promise<number> {
  let stored = 0;

  for (const bill of bills) {
    try {
      const billId = `${bill.congress}-${bill.billType}-${bill.billNumber}`;

      // Optionally fetch summary, full text, and ALL metadata
      let summary = bill.summary || null;
      let fullText = null;
      let cosponsors: any[] = [];
      let cosponsorCount = 0;
      let actions: any[] = [];
      let policyArea = null;
      let subjects: string[] = [];

      if (fetchFullText) {
        console.log(`   📄 Fetching complete details for ${billId}...`);

        // Fetch summary
        if (!summary) {
          const fetchedSummary = await fetchBillSummary(bill.congress, bill.billType, bill.billNumber);
          if (fetchedSummary) {
            summary = fetchedSummary;
          }
          await sleep(1000); // Rate limit
        }

        // Fetch full text
        const fetchedText = await fetchBillText(bill.congress, bill.billType, bill.billNumber);
        if (fetchedText) {
          fullText = fetchedText;
        }
        await sleep(1000); // Rate limit

        // Fetch cosponsors
        const fetchedCosponsors = await fetchBillCosponsors(bill.congress, bill.billType, bill.billNumber);
        if (fetchedCosponsors && fetchedCosponsors.length > 0) {
          cosponsors = fetchedCosponsors;
          cosponsorCount = cosponsors.length;
        }
        await sleep(1000); // Rate limit

        // Fetch actions/history
        const fetchedActions = await fetchBillActions(bill.congress, bill.billType, bill.billNumber);
        if (fetchedActions && fetchedActions.length > 0) {
          actions = fetchedActions;
        }
        await sleep(1000); // Rate limit

        // Fetch subjects (policy area + legislative subjects)
        const fetchedSubjects = await fetchBillSubjects(bill.congress, bill.billType, bill.billNumber);
        if (fetchedSubjects) {
          policyArea = fetchedSubjects.policyArea;
          subjects = fetchedSubjects.legislativeSubjects;
        }
        await sleep(1000); // Rate limit
      }

      // Generate searchable text (include summary and full text if available)
      const searchableText = generateSearchableText({
        ...bill,
        summary,
        fullText
      });

      const response = await fetch(`${raindropServiceUrl}/api/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: billId,
          congress: bill.congress,
          billType: bill.billType,
          billNumber: bill.billNumber,
          title: bill.title,
          summary: summary,
          fullText: fullText,
          sponsorBioguideId: bill.sponsorBioguideId || null,
          sponsorName: bill.sponsorName || null,
          sponsorParty: bill.sponsorParty || null,
          sponsorState: bill.sponsorState || null,
          introducedDate: bill.introducedDate || null,
          latestActionDate: bill.latestActionDate || null,
          latestActionText: bill.latestActionText || null,
          status: bill.status || 'introduced',
          policyArea: policyArea,
          issueCategories: subjects.length > 0 ? subjects : (bill.issueCategories || []),
          impactScore: bill.impactScore || 0,
          cosponsorCount: cosponsorCount,
          cosponsors: cosponsors,
          actions: actions,
          congressGovUrl: bill.url || null,
          searchableText: searchableText
        })
      });

      if (response.ok) {
        stored++;
        if (fetchFullText && fullText) {
          console.log(`   ✅ Stored ${billId}: ${Math.round(fullText.length / 1024)}KB text, ${cosponsorCount} cosponsors, ${actions.length} actions, ${subjects.length} subjects`);
        }
      } else {
        const error = await response.text();
        console.warn(`⚠️  Failed to store ${billId}: ${error}`);
      }
    } catch (error) {
      console.error(`❌ Error storing bill:`, error);
    }
  }

  return stored;
}

/**
 * Fetch all bills from a single Congress
 */
async function fetchCongress(
  congress: number,
  options: FetchOptions
): Promise<{ fetched: number; stored: number }> {
  console.log(`\n📋 Fetching bills from Congress ${congress}...`);

  let offset = 0;
  let totalFetched = 0;
  let totalStored = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      // Check if we've hit the limit
      if (options.maxBillsPerCongress && totalFetched >= options.maxBillsPerCongress) {
        console.log(`✅ Reached limit of ${options.maxBillsPerCongress} bills for Congress ${congress}`);
        break;
      }

      // Fetch batch
      console.log(`   Fetching bills ${offset}-${offset + options.batchSize}...`);
      const bills = await fetchRecentBills({
        congress,
        limit: options.batchSize,
        offset,
        sort: 'updateDate+desc'
      });

      if (bills.length === 0) {
        console.log(`✅ No more bills found for Congress ${congress}`);
        hasMore = false;
        break;
      }

      totalFetched += bills.length;

      // Store in database
      const stored = await storeBills(bills, options.raindropServiceUrl, options.fetchFullText);
      totalStored += stored;

      console.log(`   ✅ Fetched ${bills.length} bills, stored ${stored} (total: ${totalFetched} fetched, ${totalStored} stored)`);

      // Check if we got fewer bills than requested (means we're at the end)
      if (bills.length < options.batchSize) {
        console.log(`✅ Reached end of bills for Congress ${congress}`);
        hasMore = false;
        break;
      }

      offset += options.batchSize;

      // Rate limit: Wait 1 second between requests
      await sleep(1000);

    } catch (error: any) {
      console.error(`❌ Error fetching bills from Congress ${congress}:`, error.message);

      // If it's a rate limit error, wait longer
      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        console.log('⏳ Rate limit hit, waiting 5 seconds...');
        await sleep(5000);
      } else {
        // For other errors, continue to next batch
        offset += options.batchSize;
        await sleep(1000);
      }
    }
  }

  return { fetched: totalFetched, stored: totalStored };
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting automated bill fetching...\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const flags = {
    congress: args.find(arg => arg.startsWith('--congress='))?.split('=')[1],
    all: args.includes('--all'),
    limit: args.find(arg => arg.startsWith('--limit='))?.split('=')[1],
    full: args.includes('--full'),
  };

  // Determine which Congresses to fetch
  let congresses: number[];
  if (flags.all) {
    // Fetch recent 5 Congresses (2017-2026)
    congresses = [119, 118, 117, 116, 115];
    console.log('📚 Fetching all recent Congresses: 115-119 (2017-2026)');
  } else if (flags.congress) {
    congresses = [parseInt(flags.congress, 10)];
    console.log(`📚 Fetching Congress ${flags.congress}`);
  } else {
    // Default: current Congress
    congresses = [119];
    console.log('📚 Fetching current Congress: 119 (2025-2026)');
  }

  const maxBillsPerCongress = flags.limit ? parseInt(flags.limit, 10) : undefined;
  if (maxBillsPerCongress) {
    console.log(`📊 Limit: ${maxBillsPerCongress} bills per Congress`);
  }

  if (flags.full) {
    console.log('📄 Full mode: Fetching ALL metadata (summary, full text, cosponsors, actions, subjects)');
    console.log('⚠️  VERY SLOW - 6 API calls per bill! ~15 seconds per bill with rate limiting');
  }

  // Get Raindrop service URL
  const raindropServiceUrl = process.env.RAINDROP_SERVICE_URL;
  if (!raindropServiceUrl) {
    console.error('❌ RAINDROP_SERVICE_URL not set in environment');
    process.exit(1);
  }

  console.log(`🔗 Raindrop service: ${raindropServiceUrl}\n`);

  const options: FetchOptions = {
    congresses,
    batchSize: 100,
    maxBillsPerCongress,
    raindropServiceUrl,
    fetchFullText: flags.full
  };

  // Fetch each Congress
  const startTime = Date.now();
  let grandTotalFetched = 0;
  let grandTotalStored = 0;

  for (const congress of congresses) {
    const { fetched, stored } = await fetchCongress(congress, options);
    grandTotalFetched += fetched;
    grandTotalStored += stored;
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log('\n' + '='.repeat(60));
  console.log('✨ Bill fetching complete!');
  console.log('='.repeat(60));
  console.log(`📊 Total bills fetched: ${grandTotalFetched}`);
  console.log(`💾 Total bills stored: ${grandTotalStored}`);
  console.log(`⏱️  Duration: ${duration} seconds (${Math.round(duration / 60)} minutes)`);
  console.log(`⚡ Average: ${Math.round(grandTotalFetched / duration)} bills/second`);
  console.log('='.repeat(60));

  console.log('\n✅ Next steps:');
  console.log('   1. Sync bills to Algolia: npm run sync:algolia');
  console.log('   2. Test search: curl "http://localhost:3000/api/search?q=healthcare"');
  console.log('   3. View bills: curl "http://localhost:3000/api/bills?limit=10"');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
