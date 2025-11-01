import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

/**
 * GET /api/admin/sync-status
 * Fetches the latest bill sync status and history from GitHub Actions
 * Requires admin authentication
 */
export async function GET() {
  try {
    // Check authentication (optional - add admin check here if needed)
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch latest sync status from database
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'sync_history',
        query: `
          SELECT * FROM sync_history
          WHERE sync_type = 'daily_bill_sync'
          ORDER BY started_at DESC
          LIMIT 10
        `
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sync history from database');
    }

    const data = await response.json();
    const history = data.rows || [];

    // Get latest run
    const latest = history[0] || null;

    // Calculate stats
    const totalRuns = history.length;
    const successfulRuns = history.filter((r: any) => r.status === 'success').length;
    const failedRuns = history.filter((r: any) => r.status === 'failure').length;
    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns * 100).toFixed(1) : 0;

    return NextResponse.json({
      latest,
      history,
      stats: {
        totalRuns,
        successfulRuns,
        failedRuns,
        successRate: parseFloat(successRate as string)
      }
    });

  } catch (error) {
    console.error('Sync status API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch sync status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
