import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithPassword } from '@/lib/auth/workos';
import { createSession } from '@/lib/auth/session';
import { upsert, executeQuery } from '@/lib/db/client';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /auth/login-password
 * Authenticate user with email and password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Authenticate with WorkOS
    const { user, accessToken, refreshToken } = await authenticateWithPassword(
      email,
      password
    );

    console.log(`✅ User authenticated: ${user.email} (${user.id})`);

    // Check if user exists and has completed onboarding
    const existingUser = await executeQuery(
      `SELECT id, email, onboarding_completed, zip_code, state, district FROM users WHERE id = '${user.id}' LIMIT 1`,
      'users'
    );

    const hasCompletedOnboarding = existingUser.rows &&
                                   existingUser.rows.length > 0 &&
                                   existingUser.rows[0].onboarding_completed === 1;

    // Create or update user in database
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;

    // Only create user if they don't exist - don't overwrite existing data
    if (!existingUser.rows || existingUser.rows.length === 0) {
      await upsert('users', {
        id: user.id,
        email: user.email,
        name: fullName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      console.log(`✅ Created new user: ${user.email} (${user.id})`);
    } else {
      // User exists - only update name and timestamp, preserve all other fields
      await executeQuery(
        `UPDATE users SET name = '${fullName}', updated_at = '${new Date().toISOString()}' WHERE id = '${user.id}'`,
        'users'
      );
    }

    // Create session
    await createSession(accessToken, refreshToken, {
      id: user.id,
      email: user.email,
    });

    // Return success with redirect URL
    return NextResponse.json({
      success: true,
      redirectTo: hasCompletedOnboarding ? '/dashboard' : '/onboarding',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });

  } catch (error) {
    console.error('Login error:', error);

    // Handle specific WorkOS errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid credentials') ||
          error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      if (error.message.includes('email not verified')) {
        return NextResponse.json(
          { error: 'Please verify your email address before signing in' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to sign in. Please try again.' },
      { status: 500 }
    );
  }
}
