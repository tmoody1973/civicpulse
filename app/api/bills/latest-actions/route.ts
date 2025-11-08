/**
 * Latest Bill Actions API Route
 *
 * Fetches the most recent bill actions from Congress.gov API
 * Updated daily with 24-hour cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentBills } from '@/lib/api/congress';

// Cache for 24 hours (86400 seconds)
export const revalidate = 86400;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    console.log(`[LatestActions API] Fetching ${limit} recent bill actions`);

    // Fetch recent bills (already sorted by updateDate desc)
    const bills = await fetchRecentBills({
      congress: 119, // Current congress (119th - 2025-2027)
      limit: Math.min(limit, 50), // Max 50 for performance
      sort: 'updateDate+desc'
    });

    console.log('[LatestActions API] Sample bill data:', JSON.stringify(bills[0], null, 2));

    // Transform to simplified format for widget (include sponsor info)
    const latestActions = bills.map(bill => ({
      billId: `${bill.billType.toUpperCase()}${bill.billNumber}`,
      billNumber: `${bill.billType.toUpperCase()}. ${bill.billNumber}`,
      billTitle: bill.title,
      actionDate: bill.latestActionDate,
      actionText: bill.latestActionText,
      congress: bill.congress,
      url: bill.url,
      sponsorBioguideId: bill.sponsorBioguideId || null,
      sponsorName: bill.sponsorName || null,
      sponsorParty: bill.sponsorParty || null,
      sponsorState: bill.sponsorState || null,
    }));

    return NextResponse.json({
      success: true,
      data: latestActions,
      meta: {
        total: latestActions.length,
        congress: 119,
        lastUpdated: new Date().toISOString(),
      }
    });

  } catch (error: any) {
    console.error('Error fetching latest bill actions:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch latest bill actions',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
