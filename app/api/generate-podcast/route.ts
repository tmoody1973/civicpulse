/**
 * Generate Podcast API Route (Pre-generation + Queue Fallback)
 *
 * OPTIMIZED: Check cache for pre-generated podcast first (instant delivery),
 * fallback to queue-based generation if not cached.
 *
 * Flow:
 * 1. Check cache for today's podcast → instant return if found (<1s)
 * 2. Cache miss → submit to queue and return job ticket
 * 3. User polls /api/audio-status/[jobId] for progress
 * 4. Worker completes → cache result for future requests
 *
 * Why this works:
 * - Cache hit: Instant delivery (<1s) ✅
 * - Cache miss: Queue-based generation (no timeout) ✅
 * - Best of both worlds: Speed + reliability
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { nanoid } from 'nanoid';
import { getCachedPodcast } from '@/lib/podcast/cache';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      type = 'daily', // 'daily' or 'weekly'
      forceRegenerate = false, // Force new generation (bypass cache)
    } = body;

    // Validate type
    if (type !== 'daily' && type !== 'weekly') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "daily" or "weekly"' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Step 1: Check cache (unless force regenerate)
    if (!forceRegenerate) {
      console.log(`🔍 Checking cache for ${type} podcast (user: ${user.id})`);
      const cached = await getCachedPodcast(user.id, type);

      if (cached) {
        console.log(`✅ Cache hit! Returning pre-generated podcast instantly`);

        return NextResponse.json({
          success: true,
          cached: true,
          audioUrl: cached.audioUrl,
          transcript: cached.transcript,
          billsCovered: cached.billsCovered,
          duration: cached.duration,
          generatedAt: cached.generatedAt,
          message: 'Your podcast is ready! (Pre-generated)',
          source: 'cache'
        });
      }

      console.log(`❌ Cache miss - generating new podcast via queue`);
    } else {
      console.log(`🔄 Force regenerate requested - bypassing cache`);
    }

    // Check if this is a test user - return mock job instantly
    if (user.id.startsWith('test_')) {
      console.log(`🧪 Test user detected (${user.id}), returning mock job`);

      const mockJobId = `test_job_${nanoid(10)}`;

      // For test users, simulate instant completion (no actual job processing)
      return NextResponse.json({
        success: true,
        jobId: mockJobId,
        status: 'queued',
        message: `Your ${type} podcast is being generated. Check status at /api/audio-status/${mockJobId}`,
        estimatedDuration: type === 'daily' ? 60 : 120,
        pollUrl: `/api/audio-status/${mockJobId}`,
        testMode: true,
      });
    }

    // Generate unique job ID
    const jobId = `${user.id}-${type}-${Date.now()}`;

    console.log(`📻 Submitting ${type} podcast job for user: ${user.id} (jobId: ${jobId})`);

    // Fetch user profile for podcast personalization
    const profileResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/preferences/profile`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }
    );

    if (!profileResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: profileResponse.status }
      );
    }

    const profileData = await profileResponse.json();
    const profile = profileData.profile;

    // Insert job into database queue (fallback due to Raindrop Service binding bug)
    console.log(`📤 Inserting job ${jobId} into podcast_jobs table`);

    try {
      const { execute } = await import('@/lib/db/sqlite');

      // Insert job record
      execute(
        `INSERT INTO podcast_jobs (
          job_id, user_id, type, status, progress, message,
          bill_count, topics, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          jobId,
          user.id,
          type,
          'queued',
          0,
          'Job queued for processing...',
          type === 'daily' ? 3 : 8,
          JSON.stringify(profile.topics || [])
        ]
      );

      console.log(`✅ Job ${jobId} inserted into database queue`);

      // Trigger background processor (fire-and-forget)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/process-podcast-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY || 'dev-key'
        },
      }).catch(err => console.error('Processor trigger failed:', err));

    } catch (dbError: any) {
      console.error('❌ Failed to insert job into database:', dbError);
      return NextResponse.json(
        { error: 'Failed to queue podcast generation job', details: dbError.message },
        { status: 500 }
      );
    }

    // Return job ticket immediately (<1s response time)
    return NextResponse.json({
      success: true,
      jobId,
      status: 'queued',
      message: `Your ${type} podcast is being generated. Check status at /api/audio-status/${jobId}`,
      estimatedDuration: type === 'daily' ? 60 : 120, // seconds
      pollUrl: `/api/audio-status/${jobId}`,
      pollInterval: 3000, // Poll every 3 seconds
    });

  } catch (error) {
    console.error('❌ Error submitting podcast job:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to submit podcast generation job',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check API status
export async function GET() {
  const hasCongressKey = !!process.env.CONGRESS_API_KEY;
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasElevenLabsKey = !!process.env.ELEVENLABS_API_KEY;
  const hasVultrConfig = !!(
    process.env.VULTR_STORAGE_ENDPOINT &&
    process.env.VULTR_ACCESS_KEY &&
    process.env.VULTR_SECRET_KEY
  );

  return NextResponse.json({
    service: 'Podcast Generation API',
    status: 'online',
    integrations: {
      congress: hasCongressKey ? 'configured' : 'missing',
      claude: hasAnthropicKey ? 'configured' : 'missing',
      elevenlabs: hasElevenLabsKey ? 'configured' : 'missing',
      vultr: hasVultrConfig ? 'configured' : 'missing',
    },
    note: 'Use POST with {"userId": "...", "type": "daily|weekly", "useTestData": true} to generate a podcast',
  });
}
