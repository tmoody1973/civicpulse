import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { executeQuery } from '@/lib/db/client';

/**
 * GET /api/user/profile
 * Returns current user's profile data
 */
export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch full user profile from database
    const result = await executeQuery(
      `SELECT id, email, name, zip_code, state, district, city, created_at, updated_at
       FROM users
       WHERE id = '${user.id}'
       LIMIT 1`,
      'users'
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
