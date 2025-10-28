import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';

/**
 * POST /auth/logout
 * Destroys user session and redirects to home page
 */
export async function POST(request: NextRequest) {
  try {
    // Destroy session by clearing cookies
    await destroySession();

    console.log('✅ User logged out');

    // Redirect to home page
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, redirect to home
    return NextResponse.redirect(new URL('/', request.url));
  }
}

/**
 * GET /auth/logout
 * Also support GET for easier logout links
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
