import { requireAdmin } from "@/lib/auth/session";
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { executeQuery } from '@/lib/db/client';

/**
 * GET /api/admin/briefs/count
 * Get total count of briefs in database
 */
export async function GET() {
  try {
    await requireAdmin();
    // Check authentication
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query count
    const result = await executeQuery(
      `SELECT COUNT(*) as count FROM briefs`,
      'users'
    );

    const count = result.rows?.[0]?.count || 0;

    return NextResponse.json({ count });

  } catch (error) {
    console.error('Error counting briefs:', error);
    return NextResponse.json(
      { error: 'Failed to count briefs', count: 0 },
      { status: 500 }
    );
  }
}
