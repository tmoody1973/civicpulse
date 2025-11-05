import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

// Raindrop preferences service URL
const PREFERENCES_SERVICE_URL = process.env.PREFERENCES_SERVICE_URL ||
  'https://svc-01k99hhg7a418972m0mjvbnn6y.01k66gywmx8x4r0w31fdjjfekf.lmapp.run';

/**
 * GET /api/preferences/profile
 * Get user profile (triggers migration if needed)
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`📝 Fetching profile for user: ${user.id}`);

    // Call Raindrop preferences service (this triggers migration!)
    const response = await fetch(
      `${PREFERENCES_SERVICE_URL}/api/preferences/profile?userId=${user.id}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Preferences service error:', errorText);

      // Return default preferences if service fails
      return NextResponse.json({
        success: true,
        profile: null,
        message: 'Using default preferences'
      });
    }

    const data = await response.json();

    if (data.success && data.profile) {
      console.log(`✅ Profile loaded for user: ${user.id}`);
    } else {
      console.log(`⚠️ No profile found for user: ${user.id}`);
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/preferences/profile
 * Update user profile
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get user from session
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Call Raindrop preferences service
    const response = await fetch(
      `${PREFERENCES_SERVICE_URL}/api/preferences/profile`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          updates: body.updates,
          source: body.source || 'settings',
          metadata: body.metadata,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Preferences service error:', errorText);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Profile update API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
