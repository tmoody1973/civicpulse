import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/auth/workos';
import { executeQuery } from '@/lib/db/client';

/**
 * POST /api/auth/resend-verification
 * Resends email verification email
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Look up user ID from email
    const userResult = await executeQuery(
      `SELECT id FROM users WHERE email = '${email}' LIMIT 1`,
      'users'
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult.rows[0].id as string;

    // Send verification email via WorkOS
    try {
      await sendVerificationEmail(userId);

      console.log(`✅ Resent verification email to: ${email}`);

      return NextResponse.json({
        success: true,
        message: 'Verification email sent',
      });
    } catch (workosError: any) {
      console.error('WorkOS resend error:', workosError);

      if (workosError.message?.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a few minutes and try again.' },
          { status: 429 }
        );
      }

      throw workosError;
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      {
        error: 'Failed to resend verification email',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
