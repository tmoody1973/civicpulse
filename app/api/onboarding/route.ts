import { NextRequest, NextResponse } from 'next/server';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL || 'http://localhost:8787';

/**
 * POST /api/onboarding
 * Saves user onboarding data (zip code, interests, preferences)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate user ID (in production, this would come from auth provider)
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Call Raindrop service to save user data
    // Note: RAINDROP_SERVICE_URL already includes /api/mock, so we just add /users
    const response = await fetch(`${RAINDROP_SERVICE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: userId,
        email: body.email,
        name: body.name,
        zipCode: body.zipCode,
        interests: body.interests || [],
        emailNotifications: body.emailNotifications ?? true,
        audioEnabled: body.audioEnabled ?? true,
        audioFrequencies: body.audioFrequencies || ['daily', 'weekly'],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to save onboarding data' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      userId,
      message: 'Onboarding completed successfully',
      data,
    });

  } catch (error) {
    console.error('Onboarding API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
