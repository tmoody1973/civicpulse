/**
 * Test API: Create Session
 *
 * Creates a test user session for E2E tests.
 * Only works in non-production environments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/client';
import jwt from 'jsonwebtoken';

// JWT secret (must match lib/auth/session.ts)
const JWT_SECRET = process.env.JWT_SECRET || 'civic-pulse-secret-change-in-production';

export async function POST(req: NextRequest) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test API not available in production' },
      { status: 403 }
    );
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate a test user ID based on email
    const userId = `test_${Buffer.from(email).toString('base64').slice(0, 20)}`;

    // Create or update test user in database
    try {
      // Check if user exists
      const existingUser = await executeQuery(
        `SELECT id FROM users WHERE id = '${userId}' LIMIT 1`,
        'users'
      );

      if (!existingUser.rows || existingUser.rows.length === 0) {
        // Create new test user
        await executeQuery(
          `INSERT INTO users (id, email, onboarding_completed, created_at, updated_at)
           VALUES ('${userId}', '${email}', true, datetime('now'), datetime('now'))`,
          'users'
        );
      } else {
        // Update existing test user
        await executeQuery(
          `UPDATE users
           SET email = '${email}', onboarding_completed = true, updated_at = datetime('now')
           WHERE id = '${userId}'`,
          'users'
        );
      }
    } catch (dbError) {
      console.error('Database error creating test user:', dbError);
      // Continue anyway - JWT will work even without database entry
    }

    // Create JWT session token
    const sessionToken = jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      sessionToken,
      userId,
      email,
    });
  } catch (error) {
    console.error('Error creating test session:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create test session',
      },
      { status: 500 }
    );
  }
}
