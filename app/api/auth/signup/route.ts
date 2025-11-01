import { NextRequest, NextResponse } from 'next/server';
import { createUserWithPassword, sendVerificationEmail } from '@/lib/auth/workos';
import { createSession } from '@/lib/auth/session';
import { upsert } from '@/lib/db/client';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

/**
 * POST /auth/signup
 * Create a new user account with email and password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;

    // Split name into first and last name
    const nameParts = name?.split(' ') || [];
    const firstName = nameParts[0] || undefined;
    const lastName = nameParts.slice(1).join(' ') || undefined;

    // Create user in WorkOS
    const workosUser = await createUserWithPassword(
      email,
      password,
      firstName,
      lastName
    );

    console.log(`✅ Created WorkOS user: ${email} (${workosUser.id})`);

    // Create user in database
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;
    await upsert('users', {
      id: workosUser.id,
      email: workosUser.email,
      name: fullName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    console.log(`✅ Created database user: ${email} (${workosUser.id})`);

    // Send verification email
    try {
      await sendVerificationEmail(workosUser.id);
      console.log(`📧 Sent verification email to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail the signup if email sending fails
    }

    // For email/password, we need to authenticate after creation
    // WorkOS doesn't return tokens on user creation
    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email for verification.',
      userId: workosUser.id,
      email: workosUser.email,
      emailVerified: workosUser.emailVerified,
    });

  } catch (error) {
    console.error('Sign up error:', error);

    // Handle specific WorkOS errors
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      if (error.message.includes('password')) {
        return NextResponse.json(
          { error: 'Password does not meet requirements' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
