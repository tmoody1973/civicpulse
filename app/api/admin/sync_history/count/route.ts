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
        query: 'SELECT COUNT(*) as count FROM sync_history'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to count sync_history records');
    }

    const data = await response.json();
    const count = data.rows?.[0]?.count || 0;

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Sync history count API error:', error);
    return NextResponse.json(
      { error: 'Failed to count sync history', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
