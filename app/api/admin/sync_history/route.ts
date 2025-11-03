import { requireAdmin } from "@/lib/auth/session";
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

export async function GET() {
  try {
    await requireAdmin();
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'sync_history',
        query: 'SELECT * FROM sync_history ORDER BY started_at DESC LIMIT 50'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sync_history from database');
    }

    const data = await response.json();
    return NextResponse.json({ rows: data.rows || [] });
  } catch (error) {
    console.error('Sync history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync history', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
