import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth/session';
import { executeQuery } from '@/lib/db/client';

/**
 * DEV ONLY: Create a test session for development
 * POST /api/auth/dev-login
 */
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Dev login not available in production' },
      { status: 403 }
    );
  }

  try {
    // Use real user ID (your WorkOS user)
    const testUserId = 'user_01K8NC5EJ3JBZKC9EQRQBQQVK4';
    const testEmail = 'tarik@hakivo.dev';

    // Check if user exists
    const existingUser = await executeQuery(
      `SELECT id FROM users WHERE id = '${testUserId}' LIMIT 1`,
      'users'
    );

    if (!existingUser.rows || existingUser.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found. Please complete onboarding first.' },
        { status: 404 }
      );
    }

    // Create session
    await createSession('dev_token', 'dev_refresh', {
      id: testUserId,
      email: testEmail,
    });

    console.log('✅ Dev session created');

    return NextResponse.json({
      success: true,
      message: 'Test session created',
      user: {
        id: testUserId,
        email: testEmail,
      },
    });
  } catch (error) {
    console.error('Dev login error:', error);
    return NextResponse.json(
      { error: 'Failed to create test session' },
      { status: 500 }
    );
  }
}
