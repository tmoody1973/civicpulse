import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithCode } from '@/lib/auth/workos';
import { upsert, executeQuery } from '@/lib/db/client';
import jwt from 'jsonwebtoken';

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
      console.log(`✅ User authenticated: ${user.email} (${user.id})`);
    }

    // Create session token
    const JWT_SECRET = process.env.JWT_SECRET || 'civic-pulse-secret-change-in-production';
    const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect based on onboarding status
    const redirectUrl = hasCompletedOnboarding
      ? new URL('/dashboard', request.url)
      : new URL('/onboarding', request.url);

    console.log(`${hasCompletedOnboarding ? '👤 Returning user' : '🆕 New user'} - redirecting to ${redirectUrl.pathname}`);

    // Create response with redirect and set session cookie
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('civic_pulse_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('Authentication callback error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url));
  }
}
