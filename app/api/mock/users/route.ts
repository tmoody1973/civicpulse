import { NextResponse } from 'next/server';

// Temporary in-memory storage (will be replaced with Raindrop when fixed)
const mockUsers = new Map<string, any>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      email,
      name,
      zipCode,
      interests,
      emailNotifications,
      audioEnabled,
      audioFrequencies
    } = body;

    mockUsers.set(email, {
      id,
      email,
      name,
      zip_code: zipCode,
      interests: interests || [],
      email_notifications: emailNotifications ?? true,
      audio_enabled: audioEnabled ?? true,
      audio_frequencies: audioFrequencies || ['daily', 'weekly'],
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully (mock)',
      user: mockUsers.get(email)
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      );
    }

    const user = mockUsers.get(email);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
