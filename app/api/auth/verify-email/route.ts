import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail } from '@/lib/auth/workos';
import { executeQuery } from '@/lib/db/client';

/**
 * POST /api/auth/verify-email
 * Verifies email with the code sent by WorkOS
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
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

    // Verify the email with WorkOS
    try {
      const result = await verifyEmail(userId, code);

      console.log(`✅ Email verified successfully: ${email}`);

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully',
        emailVerified: result.emailVerified,
      });
    } catch (workosError: any) {
      console.error('WorkOS verification error:', workosError);

      // Handle specific WorkOS errors
      if (workosError.message?.includes('expired')) {
        return NextResponse.json(
          { error: 'Verification code has expired. Please request a new one.' },
          { status: 400 }
        );
      }

      if (workosError.message?.includes('invalid') || workosError.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Invalid verification code. Please check and try again.' },
          { status: 400 }
        );
      }

      throw workosError;
    }
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify email',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
