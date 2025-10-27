import { NextResponse } from 'next/server';

/**
 * Database query endpoint for testing and administration
 * POST /api/db/query
 */
export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Call Raindrop backend database service
    const backendUrl = process.env.RAINDROP_BACKEND_URL || 'http://localhost:8787';
    const response = await fetch(`${backendUrl}/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database query failed' },
      { status: 500 }
    );
  }
}
