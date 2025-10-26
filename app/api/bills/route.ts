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
