import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/auth/workos';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email to user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    console.log(`📧 Sending password reset email to: ${email}`);

    // Send password reset email via WorkOS
    await sendPasswordResetEmail(email);

    console.log(`✅ Password reset email sent to: ${email}`);

    // Always return success to prevent email enumeration attacks
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });

  } catch (error) {
    console.error('Forgot password error:', error);

    // Don't expose whether the email exists or not (security best practice)
    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  }
}
