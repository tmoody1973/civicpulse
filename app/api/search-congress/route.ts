import { NextRequest, NextResponse } from 'next/server';
import { fetchBillDetails, searchBills } from '@/lib/api/congress';
import { enhanceBill, type EnhancedBill } from '@/lib/api/congress-enhanced';
import { syncSingleBill } from '@/lib/search/algolia-sync';

/**
 * Congress.gov Fallback Search API
 *
 * Used when Algolia doesn't have a bill (brand new bills not yet synced)
 * Searches Congress.gov directly and syncs result to Algolia for next time
 *
 * POST /api/search-congress
 * Body: { query: string, congress?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const { query, congress = 119 } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Congress.gov fallback search: "${query}"`);

    // Parse bill number pattern (e.g., "HR 1234", "S 567", "H.J.Res. 45")
    const billPattern = /^(hr?|s|h\.?j\.?res|s\.?j\.?res|h\.?con\.?res|s\.?con\.?res|h\.?res|s\.?res)\.?\s*(\d+)$/i;
    const match = query.trim().match(billPattern);

    let bills: EnhancedBill[] = [];

    if (match) {
      // DIRECT BILL LOOKUP
      const [_, rawType, billNumber] = match;

      // Normalize bill type (remove dots, lowercase)
      const billType = rawType.toLowerCase().replace(/\./g, '');

      console.log(`📋 Direct bill lookup: ${billType.toUpperCase()} ${billNumber}`);

      try {
        // Fetch from Congress.gov
        const bill = await fetchBillDetails(congress, billType, parseInt(billNumber));

        // Enhance with our metadata
        const enhanced = await enhanceBill(bill, false); // Skip cosponsors for speed

        bills = [enhanced];

        // Background sync to Algolia (don't wait)
        syncSingleBill(enhanced)
          .then(() => console.log(`✅ Synced ${enhanced.id} to Algolia`))
          .catch(err => console.error(`❌ Failed to sync ${enhanced.id}:`, err));

      } catch (error: any) {
        console.error(`❌ Bill not found: ${billType.toUpperCase()} ${billNumber}`, error);

        return NextResponse.json({
          results: [],
          source: 'congress-api',
          error: 'Bill not found',
          suggestions: [
            `Check the bill number (e.g., HR 1234, S 567)`,
            `Verify Congress number (${congress} is current)`,
            'Bill may not be introduced yet',
          ],
        });
      }
    } else {
      // TEXT SEARCH
      console.log(`🔎 Text search on Congress.gov: "${query}"`);

      try {
        // Search Congress.gov (their search is slow and limited)
        const searchResults = await searchBills(query, {
          congress,
          limit: 20,
        });

        // Enhance each result
        const enhancedPromises = searchResults.map(bill =>
          enhanceBill(bill, false).catch(err => {
            console.error(`Failed to enhance bill ${bill.billType}${bill.billNumber}:`, err);
            return null;
          })
        );

        const enhanced = await Promise.all(enhancedPromises);
        bills = enhanced.filter((b): b is EnhancedBill => b !== null);

        // Background sync top 5 results to Algolia
        const topBills = bills.slice(0, 5);
        topBills.forEach(bill => {
          syncSingleBill(bill)
            .then(() => console.log(`✅ Synced ${bill.id} to Algolia`))
            .catch(err => console.error(`❌ Failed to sync ${bill.id}:`, err));
        });

      } catch (error: any) {
        console.error('❌ Congress.gov search failed:', error);

        return NextResponse.json({
          results: [],
          source: 'congress-api',
          error: 'Search failed',
          message: 'Unable to search Congress.gov. Please try again.',
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      results: bills,
      source: 'congress-api',
      count: bills.length,
      message: bills.length > 0
        ? '✨ Found in Congress.gov! These bills are now being added to our search index for instant results next time.'
        : 'No bills found matching your search.',
    });

  } catch (error: any) {
    console.error('❌ Search API error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}
