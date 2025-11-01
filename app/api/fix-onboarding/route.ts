import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { executeQuery } from '@/lib/db/client';

export const runtime = 'nodejs';

/**
 * POST /api/fix-onboarding
 * Manually marks the current user's onboarding as completed
 * Useful for users who completed onboarding before the onboarding_completed field existed
 */
export async function POST() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check current status
    const checkResult = await executeQuery(
      `SELECT onboarding_completed, zip_code FROM users WHERE id = '${user.id}' LIMIT 1`,
      'users'
    );

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentUser = checkResult.rows[0];
    console.log(`📋 Current onboarding status for ${user.email}:`, {
      onboarding_completed: currentUser.onboarding_completed,
      has_zip_code: !!currentUser.zip_code
    });

    // Update onboarding_completed to 1
    await executeQuery(
      `UPDATE users SET onboarding_completed = 1, updated_at = '${new Date().toISOString()}' WHERE id = '${user.id}'`,
      'users'
    );

    console.log(`✅ Marked onboarding as completed for ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Onboarding status updated successfully',
      previous: currentUser.onboarding_completed,
      updated: 1
    });

  } catch (error) {
    console.error('Fix onboarding error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
