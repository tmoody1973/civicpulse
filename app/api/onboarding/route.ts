import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, upsert } from '@/lib/db/client';
import { getSession } from '@/lib/auth/session';

// Force Node.js runtime to allow HTTPS agent for SSL bypass
export const runtime = 'nodejs';

/**
 * POST /api/onboarding
 * Saves user onboarding data (zip code, interests, preferences)
 * Requires authentication - gets user ID and email from session
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Save user onboarding data to Raindrop SQL database
    await upsert('users', {
      id: user.id,
      email: user.email,
      name: body.name || null,
      zip_code: body.zipCode || null,
      state: body.state || null,
      district: body.district || null,
      interests: JSON.stringify(body.interests || []),
      email_notifications: body.emailNotifications ? 1 : 0,
      audio_enabled: body.audioEnabled ? 1 : 0,
      audio_frequencies: JSON.stringify(body.audioFrequencies || ['daily', 'weekly']),
      onboarding_completed: 1, // Mark onboarding as completed
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log(`✅ Saved onboarding data for user ${user.email} (${user.id})`);

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
          contact_url: rep.contact_url || null,
          twitter_handle: rep.twitter || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      console.log(`✅ Saved ${body.representatives.length} representatives to database`);
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
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
