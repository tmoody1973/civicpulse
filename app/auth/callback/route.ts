import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithCode } from '@/lib/auth/workos';
import { createSession } from '@/lib/auth/session';
import { upsert, executeQuery } from '@/lib/db/client';

/**
 * GET /auth/callback
 * Handles OAuth callback from WorkOS after user authorizes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Check for authorization code
    if (!code) {
      return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url));
    }

    // State is used for CSRF protection, we'll determine redirect based on onboarding status
    if (state) {
      try {
        // Decode state for future use if needed
        JSON.parse(Buffer.from(state, 'base64').toString());
      } catch (error) {
        console.warn('Failed to decode state:', error);
      }
    }

    // Authenticate with WorkOS
    const { user, accessToken, refreshToken } = await authenticateWithCode(code);

    // Check if user exists and has completed onboarding
    const existingUser = await executeQuery(
      `SELECT id, email, onboarding_completed, zip_code, state, district FROM users WHERE id = '${user.id}' LIMIT 1`,
      'users'
    );

    const hasCompletedOnboarding = existingUser.rows &&
                                   existingUser.rows.length > 0 &&
                                   existingUser.rows[0].onboarding_completed === 1;

    // Create or update user in database
    // Combine firstName and lastName from Google OAuth
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;

    await upsert('users', {
      id: user.id,
      email: user.email,
      name: fullName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    console.log(`✅ User authenticated: ${user.email} (${user.id})`);

    // Create session with tokens and user info
    await createSession(accessToken, refreshToken, { id: user.id, email: user.email });

    // Redirect based on onboarding status
    if (hasCompletedOnboarding) {
      // Existing user with onboarding complete → go to dashboard
      console.log('👤 Returning user - redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      // New user or incomplete onboarding → go to onboarding
      console.log('🆕 New user - redirecting to onboarding');
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  } catch (error) {
    console.error('Authentication callback error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url));
  }
}
