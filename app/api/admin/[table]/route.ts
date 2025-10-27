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
 * GET /api/admin/[table]
 * Fetch all records from a specific table
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;

    // Validate table name to prevent SQL injection
    if (!VALID_TABLES.includes(table)) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      );
    }

    // For now, we'll call the Raindrop backend directly with a SQL query
    // In production, you'd want to add specific endpoints for this
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table,
        query: `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 100`
      }),
    };

    // In development, disable SSL verification for self-signed certificates
    // @ts-ignore - Node.js fetch doesn't have this in types but it works
    if (process.env.NODE_ENV === 'development') {
      // @ts-ignore
      fetchOptions.agent = new (await import('https')).Agent({
        rejectUnauthorized: false
      });
    }

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, fetchOptions);

    if (!response.ok) {
      // If the backend doesn't have this endpoint yet, return mock data
      return NextResponse.json({
        rows: [],
        message: 'Backend endpoint not available yet. Deploy backend to see data.'
      });
    }

    const data = await response.json();

    return NextResponse.json({
      rows: data.rows || [],
      count: data.rows?.length || 0
    });

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch table data',
        message: error instanceof Error ? error.message : 'Unknown error',
        rows: [] // Return empty array on error
      },
      { status: 500 }
    );
  }
}
