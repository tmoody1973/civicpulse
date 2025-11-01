import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

/**
 * GET /api/auth/session
 * Returns the current user's session if logged in
 */
export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
