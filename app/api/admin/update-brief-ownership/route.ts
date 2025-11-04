import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/client';

export async function POST(req: Request) {
  try {
    const { oldUserId, newUserId } = await req.json();

    if (!oldUserId || !newUserId) {
      return NextResponse.json(
        { error: 'oldUserId and newUserId are required' },
        { status: 400 }
      );
    }

    // Get briefs before update
    const before = await executeQuery(
      `SELECT id, title, user_id FROM briefs WHERE user_id = '${oldUserId}'`,
      'users'
    );

    // Update briefs
    const result = await executeQuery(
      `UPDATE briefs SET user_id = '${newUserId}' WHERE user_id = '${oldUserId}'`,
      'users'
    );

    // Get briefs after update
    const after = await executeQuery(
      `SELECT id, title, user_id FROM briefs WHERE user_id = '${newUserId}'`,
      'users'
    );

    return NextResponse.json({
      success: true,
      message: `Updated ${result.rowCount || 0} briefs`,
      before: before.rows,
      after: after.rows
    });
  } catch (error) {
    console.error('Update ownership error:', error);
    return NextResponse.json(
      { error: 'Failed to update brief ownership' },
      { status: 500 }
    );
  }
}
