import { cookies } from 'next/headers';
import { executeQuery } from '@/lib/db/client';
import jwt from 'jsonwebtoken';

const SESSION_COOKIE_NAME = 'civic_pulse_session';

// Cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// JWT secret (in production, use a secure random string)
const JWT_SECRET = process.env.JWT_SECRET || 'civic-pulse-secret-change-in-production';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
}

interface SessionPayload {
  userId: string;
  email: string;
}

/**
 * Create a session by storing a JWT with user info in a cookie
 */
export async function createSession(_accessToken: string, _refreshToken: string, user: { id: string; email: string }) {
  const cookieStore = await cookies();

  // Create JWT with user ID and email
  const sessionToken = jwt.sign(
    { userId: user.id, email: user.email } as SessionPayload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Get the current user from the session
 * Looks up user info from database using the JWT
 */
export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    // Verify and decode JWT
    const payload = jwt.verify(sessionToken, JWT_SECRET) as SessionPayload;

    // Look up user from database
    const result = await executeQuery(
      `SELECT id, email, created_at, updated_at FROM users WHERE id = '${payload.userId}' LIMIT 1`,
      'users'
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    return {
      id: user.id as string,
      email: user.email as string,
      firstName: null,
      lastName: null,
      profilePictureUrl: null,
    };
  } catch (error) {
    console.error('Session verification failed:', error);
    await destroySession();
    return null;
  }
}

/**
 * Require authentication, throw error if not authenticated
 * Use this in server components that require auth
 */
export async function requireAuth(): Promise<User> {
  const user = await getSession();

  if (!user) {
    throw new Error('Unauthorized - Please sign in');
  }

  return user;
}

/**
 * Destroy the session by clearing cookies
 */
export async function destroySession() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE_NAME);
}
