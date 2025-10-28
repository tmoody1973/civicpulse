import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/auth/workos';

/**
 * GET /api/auth/authorize
 * Generates WorkOS authorization URL and redirects user to OAuth provider
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') as 'google' | 'github' | null;
    const redirectTo = searchParams.get('redirect') || '/dashboard';

    if (!provider || !['google', 'github'].includes(provider)) {
      return NextResponse.redirect(new URL('/auth/login?error=invalid_provider', request.url));
    }

    // Map provider names to WorkOS provider format
    const workosProvider = provider === 'google' ? 'GoogleOAuth' : 'GitHubOAuth';

    // Generate state parameter for CSRF protection
    // Store redirect URL in state (in production, use encrypted state)
    const state = Buffer.from(JSON.stringify({ redirectTo })).toString('base64');

    // Get authorization URL from WorkOS
    const authUrl = getAuthorizationUrl(workosProvider, state);

    // Redirect user to OAuth provider
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Authorization error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url));
  }
}
