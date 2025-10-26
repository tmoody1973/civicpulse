import { NextRequest, NextResponse } from 'next/server';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL || 'http://localhost:8787';

const VALID_TABLES = [
  'users',
  'bills',
  'representatives',
  'user_bills',
  'podcasts',
  'rss_articles',
  'vote_records'
];

/**
 * GET /api/admin/[table]/count
 * Get count of records in a specific table
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;

    // Validate table name
    if (!VALID_TABLES.includes(table)) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      );
    }

    // Call Raindrop backend for count
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/count`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table,
        query: `SELECT COUNT(*) as count FROM ${table}`
      }),
    });

    if (!response.ok) {
      // Return 0 if backend not available
      return NextResponse.json({ count: 0 });
    }

    const data = await response.json();

    return NextResponse.json({
      count: data.count || 0
    });

  } catch (error) {
    console.error('Admin count API error:', error);
    return NextResponse.json(
      { count: 0 },
      { status: 200 } // Return 0 instead of error
    );
  }
}
