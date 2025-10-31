import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '@/lib/auth/workos';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * POST /api/auth/reset-password
 * Reset user password with token from email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { token, newPassword } = validation.data;

    console.log(`🔐 Attempting password reset with token: ${token.substring(0, 10)}...`);

    // Reset password via WorkOS
    await resetPassword(token, newPassword);

    console.log(`✅ Password reset successful`);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });

  } catch (error: any) {
    console.error('Password reset error:', error);

    // Handle specific WorkOS errors
    if (error?.code === 'password_strength_error') {
      return NextResponse.json(
        {
          error: 'Password does not meet strength requirements. Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
        },
        { status: 400 }
      );
    }

    if (error?.code === 'password_reset_error') {
      return NextResponse.json(
        {
          error: 'Invalid or expired reset link. Please request a new password reset email.'
        },
        { status: 400 }
      );
    }

    if (error?.message?.includes('invalid') || error?.message?.includes('expired')) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset link.' },
        { status: 400 }
      );
    }

    if (error?.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'User not found. Please sign up for an account first.' },
        { status: 404 }
      );
    }

    // Log full error for debugging
    console.error('Full error details:', JSON.stringify(error, null, 2));

    return NextResponse.json(
      { error: 'Failed to reset password. Please try again or request a new reset link.' },
      { status: 500 }
    );
  }
}
