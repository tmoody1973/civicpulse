import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/client';

export async function POST() {
  try {
    // Delete sample briefs
    await executeQuery(
      "DELETE FROM briefs WHERE id LIKE 'brief_sample%'",
      'users'
    );

    // Delete incomplete briefs (null title)
    await executeQuery(
      "DELETE FROM briefs WHERE title IS NULL OR title = ''",
      'users'
    );

    // Get remaining briefs
    const remaining = await executeQuery(
      'SELECT id, title, user_id FROM briefs ORDER BY generated_at DESC',
      'users'
    );

    return NextResponse.json({
      success: true,
      message: 'Deleted sample and incomplete briefs',
      remaining: remaining.rows
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete briefs' },
      { status: 500 }
    );
  }
}
