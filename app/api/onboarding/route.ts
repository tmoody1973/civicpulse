import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, upsert } from '@/lib/db/client';

// Force Node.js runtime to allow HTTPS agent for SSL bypass
export const runtime = 'nodejs';

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

    // Save user to Raindrop SQL database using centralized client
    await upsert('users', {
      id: userId,
      email: body.email,
      zip_code: body.zipCode || null,
      state: body.state || null,
      district: body.district || null,
      interests: JSON.stringify(body.interests || []),
      email_notifications: body.emailNotifications ? 1 : 0,
      audio_enabled: body.audioEnabled ? 1 : 0,
      audio_frequencies: JSON.stringify(body.audioFrequencies || ['daily', 'weekly']),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log(`✅ Saved user ${userId} to database`);

    // Save representatives to database
    if (body.representatives && Array.isArray(body.representatives)) {
      for (const rep of body.representatives) {
        await upsert('representatives', {
          bioguide_id: rep.bioguide_id,
          name: rep.name,
          party: rep.party,
          chamber: rep.chamber,
          state: rep.state || body.state,
          district: rep.district || null,
          image_url: rep.photo || null,
          phone: rep.phone || null,
          website_url: rep.website || null,
          twitter_handle: rep.twitter || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      console.log(`✅ Saved ${body.representatives.length} representatives to database`);
    }

    return NextResponse.json({
      success: true,
      userId,
      message: 'Onboarding completed successfully',
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
