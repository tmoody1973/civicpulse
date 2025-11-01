import { NextRequest, NextResponse } from 'next/server';
import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);

/**
 * POST /api/auth/resend-verification
 * Resends email verification code
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

    // Send a new verification code via WorkOS passwordless
    try {
      await workos.passwordless.sendSession({
        email,
        type: 'MagicLink', // This will send a code via email
      });

      console.log(`✅ Resent verification code to: ${email}`);

      return NextResponse.json({
        success: true,
        message: 'Verification code sent',
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
        error: 'Failed to resend verification code',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
