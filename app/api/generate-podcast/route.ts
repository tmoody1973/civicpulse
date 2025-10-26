/**
 * Generate Podcast API Route
 *
 * Orchestrates the complete podcast generation pipeline:
 * 1. Fetch bills from Congress.gov
 * 2. Generate dialogue script with Claude Sonnet 4
 * 3. Generate audio with ElevenLabs text-to-dialogue
 * 4. Upload to Vultr Object Storage with CDN
 * 5. Return podcast URL and metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentBills, fetchBillDetails } from '@/lib/api/congress';
import { generateDialogueScript, generateTestDialogue } from '@/lib/ai/claude';
import { generateDialogue, estimateAudioDuration, generateTestAudio } from '@/lib/ai/elevenlabs';
import { uploadPodcast, generateMockPodcastUrl } from '@/lib/storage/vultr';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const {
      userId = 'demo-user',
      type = 'daily', // 'daily' or 'weekly'
      useTestData = false, // For development without API keys
    } = body;

    // Validate type
    if (type !== 'daily' && type !== 'weekly') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "daily" or "weekly"' },
        { status: 400 }
      );
    }

    console.log(`📻 Starting ${type} podcast generation for user: ${userId}`);

    // Step 1: Fetch bills from Congress.gov
    console.log('📥 Fetching bills from Congress.gov...');
    const billCount = type === 'daily' ? 3 : 1;
    const bills = useTestData
      ? [] // Will use test dialogue
      : await fetchRecentBills({ limit: billCount });

    if (!useTestData && bills.length === 0) {
      return NextResponse.json(
        { error: 'No bills available to generate podcast' },
        { status: 404 }
      );
    }

    // Fetch detailed summaries for each bill
    if (!useTestData) {
      console.log(`📋 Fetching detailed summaries for ${bills.length} bills...`);
      for (let i = 0; i < bills.length; i++) {
        try {
          const detailed = await fetchBillDetails(
            bills[i].congress,
            bills[i].billType,
            bills[i].billNumber
          );
          bills[i] = { ...bills[i], ...detailed };
        } catch (error) {
          console.warn(`Could not fetch details for bill ${i + 1}:`, error);
        }
      }
    }

    // Step 2: Generate dialogue script with Claude
    console.log('🎭 Generating dialogue script with Claude Sonnet 4...');
    const dialogue = useTestData
      ? generateTestDialogue()
      : await generateDialogueScript(bills, type);

    console.log(`✅ Generated script with ${dialogue.length} dialogue lines`);

    // Step 3: Generate audio with ElevenLabs
    console.log('🎙️  Generating audio with ElevenLabs text-to-dialogue...');
    const audioBuffer = useTestData
      ? await generateTestAudio()
      : await generateDialogue(dialogue);

    const audioDuration = estimateAudioDuration(dialogue);
    console.log(`✅ Generated ${(audioBuffer.length / 1024).toFixed(2)}KB audio (~${audioDuration}s)`);

    // Step 4: Upload to Vultr Object Storage
    console.log('☁️  Uploading to Vultr Object Storage...');
    const audioUrl = useTestData
      ? generateMockPodcastUrl(userId, type)
      : await uploadPodcast(audioBuffer, {
          userId,
          type,
          duration: audioDuration,
          billsCovered: bills.map((b) => `${b.billType}${b.billNumber}`),
          generatedAt: new Date(),
        });

    console.log(`✅ Podcast uploaded: ${audioUrl}`);

    // Calculate total generation time
    const generationTime = Date.now() - startTime;
    console.log(`🎉 Podcast generation complete in ${(generationTime / 1000).toFixed(2)}s`);

    // Return success response
    return NextResponse.json({
      success: true,
      audioUrl,
      duration: audioDuration,
      billsCovered: bills.map((b) => ({
        id: `${b.billType}${b.billNumber}`,
        title: b.title,
        sponsor: b.sponsorName,
      })),
      transcript: dialogue.map((d) => `${d.host.toUpperCase()}: ${d.text}`).join('\n\n'),
      generationTimeMs: generationTime,
      type,
    });
  } catch (error) {
    console.error('❌ Error generating podcast:', error);

    // Provide specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Congress API')) {
      return NextResponse.json(
        {
          error: 'Failed to fetch bills from Congress.gov',
          details: errorMessage,
          suggestion: 'Check your CONGRESS_API_KEY environment variable',
        },
        { status: 503 }
      );
    }

    if (errorMessage.includes('Claude') || errorMessage.includes('Anthropic')) {
      return NextResponse.json(
        {
          error: 'Failed to generate dialogue script',
          details: errorMessage,
          suggestion: 'Check your ANTHROPIC_API_KEY environment variable',
        },
        { status: 503 }
      );
    }

    if (errorMessage.includes('ElevenLabs')) {
      return NextResponse.json(
        {
          error: 'Failed to generate audio',
          details: errorMessage,
          suggestion: 'Check your ELEVENLABS_API_KEY and voice IDs',
        },
        { status: 503 }
      );
    }

    if (errorMessage.includes('Vultr') || errorMessage.includes('S3')) {
      return NextResponse.json(
        {
          error: 'Failed to upload podcast',
          details: errorMessage,
          suggestion: 'Check your Vultr storage credentials',
        },
        { status: 503 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Failed to generate podcast',
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
