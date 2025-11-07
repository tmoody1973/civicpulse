/**
 * Cron Job: Pre-generate Daily Podcasts
 *
 * This endpoint is called by Netlify scheduled functions (or Raindrop cron)
 * at 3am daily to pre-generate podcasts for all active users.
 *
 * Setup in Netlify:
 * 1. Create netlify/functions/pregenerate-podcasts-cron.ts
 * 2. Configure schedule in netlify.toml:
 *    [[functions]]
 *    schedule = "0 3 * * *"  # 3am daily
 *
 * Or use Raindrop cron observer:
 *    observer "podcast-pregeneration-cron" {
 *      source {
 *        schedule = "0 3 * * *"
 *      }
 *      handler = "workers/podcast-pregeneration.ts"
 *    }
 */

import { NextRequest, NextResponse } from 'next/server';
import { pregeneratePodcasts } from '@/lib/podcast/cache';

// Increase timeout for this endpoint (Netlify Pro: 26s, will move to Raindrop cron for unlimited)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🚀 Starting podcast pre-generation cron job...');

    // Run pre-generation
    const results = await pregeneratePodcasts();

    const duration = Date.now() - startTime;
    const durationMinutes = (duration / 1000 / 60).toFixed(2);

    console.log(`✅ Pre-generation complete in ${durationMinutes} minutes`);
    console.log(`   Success: ${results.success}`);
    console.log(`   Failed: ${results.failed}`);

    return NextResponse.json({
      success: true,
      results: {
        total: results.success + results.failed,
        successful: results.success,
        failed: results.failed,
        errors: results.errors
      },
      duration: `${durationMinutes} minutes`
    });

  } catch (error: any) {
    console.error('❌ Cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Pre-generation failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint for manual testing
export async function GET() {
  return NextResponse.json({
    endpoint: 'Podcast Pre-generation Cron Job',
    schedule: '0 3 * * * (3am daily)',
    method: 'POST',
    auth: 'Bearer token required (CRON_SECRET)',
    note: 'Use POST with Authorization header to trigger pre-generation'
  });
}
