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

  } catch (error) {
    console.error('Password reset error:', error);

    // Handle specific WorkOS errors
    if (error instanceof Error) {
      if (error.message.includes('invalid') || error.message.includes('expired')) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token. Please request a new password reset link.' },
          { status: 400 }
        );
      }

      if (error.message.includes('weak password')) {
        return NextResponse.json(
          { error: 'Password is too weak. Please choose a stronger password.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to reset password. Please try again or request a new reset link.' },
      { status: 500 }
    );
  }
}
