/**
 * Bills API Route
 *
 * Fetch recent bills from Congress.gov
 * Supports pagination, filtering, and search
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentBills, searchBills } from '@/lib/api/congress';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Get query parameters
    const query = searchParams.get('query'); // Search query (optional)
    const congressParam = searchParams.get('congress');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const sort = searchParams.get('sort') as 'updateDate+desc' | 'updateDate+asc' | null;

    // Parse parameters
    const congress = congressParam ? parseInt(congressParam, 10) : 118;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    console.log(`📋 Fetching bills: congress=${congress}, limit=${limit}, offset=${offset}, query=${query || 'none'}`);

    // Fetch bills (search if query provided, otherwise recent bills)
    const bills = query
      ? await searchBills(query, { congress, limit, offset })
      : await fetchRecentBills({ congress, limit, offset, sort: sort || 'updateDate+desc' });

    console.log(`✅ Found ${bills.length} bills`);

    return NextResponse.json({
      success: true,
      data: bills,
      pagination: {
        limit,
        offset,
        count: bills.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching bills:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch bills',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Fetch and store bills in database
 */
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Get query parameters
    const query = searchParams.get('query');
    const congressParam = searchParams.get('congress');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const sort = searchParams.get('sort') as 'updateDate+desc' | 'updateDate+asc' | null;

    // Parse parameters
    const congress = congressParam ? parseInt(congressParam, 10) : 118;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    console.log(`📋 Fetching and storing bills: congress=${congress}, limit=${limit}, offset=${offset}, query=${query || 'none'}`);

    // Fetch bills
    const bills = query
      ? await searchBills(query, { congress, limit, offset })
      : await fetchRecentBills({ congress, limit, offset, sort: sort || 'updateDate+desc' });

    console.log(`✅ Found ${bills.length} bills`);

    // Store in Raindrop database
    const backendUrl = process.env.RAINDROP_SERVICE_URL;

    if (backendUrl) {
      let storedCount = 0;
      for (const bill of bills) {
        try {
          const billId = `${bill.congress}-${bill.billType}-${bill.billNumber}`;

          await fetch(`${backendUrl}/api/bills`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: billId,
              congress: bill.congress,
              billType: bill.billType,
              billNumber: bill.billNumber,
              title: bill.title,
              summary: bill.summary || null,
              introducedDate: bill.introducedDate || null,
              latestActionDate: bill.latestActionDate || null,
              latestActionText: bill.latestActionText || null,
              sponsorBioguideId: bill.sponsorBioguideId || null,
              sponsorName: bill.sponsorName || null,
              congressGovUrl: bill.url || null,
            }),
          });
          storedCount++;
        } catch (err) {
          console.warn(`Failed to store bill ${bill.title}:`, err);
        }
      }
      console.log(`💾 Stored ${storedCount}/${bills.length} bills in database`);
    } else {
      console.warn('⚠️  RAINDROP_SERVICE_URL not set - skipping database storage');
    }

    return NextResponse.json({
      success: true,
      data: bills,
      stored: backendUrl ? bills.length : 0,
      message: backendUrl
        ? `Found and stored ${bills.length} bills`
        : `Found ${bills.length} bills (database storage disabled)`,
      pagination: {
        limit,
        offset,
        count: bills.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching/storing bills:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch/store bills',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
