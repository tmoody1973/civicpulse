import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/debug/cookies
 * Debug endpoint to check cookie status
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const sessionCookie = cookieStore.get('civic_pulse_session');

    return NextResponse.json({
      success: true,
      allCookies: allCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0,
      })),
      sessionCookie: sessionCookie ? {
        name: sessionCookie.name,
        hasValue: !!sessionCookie.value,
        valueLength: sessionCookie.value?.length || 0,
        firstChars: sessionCookie.value?.substring(0, 20) + '...',
      } : null,
      url: request.url,
      headers: {
        cookie: request.headers.get('cookie'),
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
