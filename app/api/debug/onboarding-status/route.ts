import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { executeQuery } from '@/lib/db/client';

export const runtime = 'nodejs';

/**
 * GET /api/debug/onboarding-status
 * Shows current onboarding status for debugging
 */
export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get current user data
    const result = await executeQuery(
      `SELECT id, email, onboarding_completed, zip_code, state, district, created_at, updated_at FROM users WHERE id = '${user.id}' LIMIT 1`,
      'users'
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const userData = result.rows[0];

    return NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        onboarding_completed: userData.onboarding_completed,
        zip_code: userData.zip_code,
        state: userData.state,
        district: userData.district,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      },
      interpretation: {
        hasCompletedOnboarding: userData.onboarding_completed === 1,
        shouldRedirectToOnboarding: userData.onboarding_completed !== 1,
      }
    });

  } catch (error) {
    console.error('Debug onboarding status error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
