import { NextRequest, NextResponse } from 'next/server';
import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);

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

    // Verify the email verification code with WorkOS
    // WorkOS email verification uses their passwordless API
    try {
      await workos.passwordless.verifySession({
        email,
        code,
      });

      console.log(`✅ Email verified successfully: ${email}`);

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully',
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

      if (workosError.message?.includes('invalid')) {
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
