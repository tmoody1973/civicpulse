import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Logout endpoint - clears session cookie
 */
export async function POST() {
  try {
    // Clear session cookie
    const cookieStore = await cookies();
    cookieStore.delete('session');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
