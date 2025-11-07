/**
 * Audio Generation Worker
 *
 * Background worker that processes audio generation jobs from the Raindrop queue.
 * Handles both podcast generation (bills) and personalized news audio.
 *
 * Flow:
 * 1. Pick up job from queue
 * 2. Update status to "processing"
 * 3. Execute audio generation pipeline:
 *    - Podcast: Fetch bills → Generate script → Generate audio
 *    - News: Fetch news → Generate script → Generate audio
 * 4. Upload audio to Vultr CDN
 * 5. Update status to "complete" with audio URL
 * 6. Notify user
 *
 * Error handling:
 * - Retry 3 times with exponential backoff (1min, 2min, 4min)
 * - Update status to "failed" after max retries
 * - Log errors with full context
 */

import { generateDialogueScript } from '@/lib/ai/claude';
import { generateDialogue } from '@/lib/ai/elevenlabs';
import { uploadPodcast } from '@/lib/storage/vultr';
import { fetchRecentBills } from '@/lib/api/congress';
import { getPersonalizedNewsFast } from '@/lib/api/cerebras-tavily';

// Job types
type JobType = 'podcast_daily' | 'podcast_weekly' | 'news_audio';

// Job payload structure
interface AudioJob {
  jobId: string;
  userId: string;
  type: JobType;
  params: PodcastParams | NewsParams;
  createdAt: Date;
  attempt: number;
}

interface PodcastParams {
  billCount: number;
  representatives: Array<{ name: string; party: string; state: string }>;
}

interface NewsParams {
  topics: string[];
  state?: string;
  district?: number;
}

// Job status
interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  progress: number;
  message: string;
  audioUrl?: string;
  duration?: number;
  error?: string;
  completedAt?: Date;
}

/**
 * Main worker handler - processes jobs from the queue
 */
export async function handleAudioJob(
  job: AudioJob,
  context: {
    env: any; // Raindrop environment (queues, KV cache, databases)
    updateProgress: (progress: number, message: string) => Promise<void>;
  }
): Promise<void> {
  const { jobId, userId, type, params } = job;
  const startTime = Date.now();

  try {
    console.log(`[Worker] Processing job ${jobId} (type: ${type}, user: ${userId})`);

    // Update status to processing
    await updateJobStatus(context.env, {
      jobId,
      status: 'processing',
      progress: 0,
      message: 'Starting audio generation...',
    });

    // Route to appropriate handler
    let audioUrl: string;
    let duration: number;

    if (type === 'podcast_daily' || type === 'podcast_weekly') {
      const result = await generatePodcastAudio(
        userId,
        type,
        params as PodcastParams,
        context
      );
      audioUrl = result.audioUrl;
      duration = result.duration;
    } else if (type === 'news_audio') {
      const result = await generateNewsAudio(
        userId,
        params as NewsParams,
        context
      );
      audioUrl = result.audioUrl;
      duration = result.duration;
    } else {
      throw new Error(`Unknown job type: ${type}`);
    }

    // Update status to complete
    const latency = Date.now() - startTime;
    console.log(`[Worker] Job ${jobId} completed in ${latency}ms`);

    await updateJobStatus(context.env, {
      jobId,
      status: 'complete',
      progress: 100,
      message: 'Audio generation complete!',
      audioUrl,
      duration,
      completedAt: new Date(),
    });

    // Send notification to user
    await sendNotification(context.env, {
      userId,
      type: 'audio_ready',
      title: 'Your audio is ready!',
      message: `Your ${type.replace('_', ' ')} is ready to listen.`,
      audioUrl,
    });

  } catch (error: any) {
    console.error(`[Worker] Job ${jobId} failed:`, error);

    // Update status to failed
    await updateJobStatus(context.env, {
      jobId,
      status: 'failed',
      progress: 0,
      message: 'Audio generation failed',
      error: error.message,
    });

    // Throw error to trigger retry
    throw error;
  }
}

/**
 * Generate podcast audio (bills-based)
 */
async function generatePodcastAudio(
  userId: string,
  type: 'podcast_daily' | 'podcast_weekly',
  params: PodcastParams,
  context: { env: any; updateProgress: (p: number, m: string) => Promise<void> }
): Promise<{ audioUrl: string; duration: number }> {

  // Step 1: Fetch bills (20%)
  await context.updateProgress(20, 'Fetching congressional bills...');
  const bills = await fetchRecentBills({
    congress: 119, // Current congress
    limit: params.billCount,
  });

  if (!bills || bills.length === 0) {
    throw new Error('No bills found for podcast generation');
  }

  console.log(`[Worker] Fetched ${bills.length} bills for podcast`);

  // Step 2: Generate dialogue script with Claude (40%)
  await context.updateProgress(40, 'Generating dialogue script with AI...');
  const dialogue = await generateDialogueScript(
    bills,
    params.representatives,
    type
  );

  if (!dialogue || dialogue.length === 0) {
    throw new Error('Failed to generate dialogue script');
  }

  console.log(`[Worker] Generated dialogue with ${dialogue.length} exchanges`);

  // Step 3: Generate audio with ElevenLabs (60%)
  await context.updateProgress(60, 'Creating audio with ElevenLabs (this takes a minute)...');
  const audioBuffer = await generateDialogue(dialogue);

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('Failed to generate audio');
  }

  console.log(`[Worker] Generated audio (${audioBuffer.length} bytes)`);

  // Step 4: Upload to Vultr CDN (80%)
  await context.updateProgress(80, 'Uploading to cloud storage...');
  const audioUrl = await uploadPodcast(audioBuffer, userId, type, {
    duration: calculateDuration(audioBuffer),
    billsCovered: bills.map(b => b.id),
    generatedAt: new Date(),
  });

  console.log(`[Worker] Uploaded audio to ${audioUrl}`);

  // Step 5: Save metadata to database (90%)
  await context.updateProgress(90, 'Saving podcast metadata...');
  const transcript = dialogue.map(d => `${d.host.toUpperCase()}: ${d.text}`).join('\n\n');

  // Save to SmartSQL database via service call
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/podcasts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      type,
      audioUrl,
      transcript,
      billsCovered: bills.map(b => b.id),
      duration: calculateDuration(audioBuffer),
      generatedAt: new Date(),
    }),
  });

  return {
    audioUrl,
    duration: calculateDuration(audioBuffer),
  };
}

/**
 * Generate personalized news audio
 */
async function generateNewsAudio(
  userId: string,
  params: NewsParams,
  context: { env: any; updateProgress: (p: number, m: string) => Promise<void> }
): Promise<{ audioUrl: string; duration: number }> {

  // Step 1: Fetch personalized news (20%)
  await context.updateProgress(20, 'Fetching personalized news articles...');
  const articles = await getPersonalizedNewsFast(
    params.topics,
    params.state,
    params.district
  );

  if (!articles || articles.length === 0) {
    throw new Error('No news articles found for audio generation');
  }

  console.log(`[Worker] Fetched ${articles.length} news articles`);

  // Step 2: Generate dialogue script with Claude (40%)
  await context.updateProgress(40, 'Generating news briefing script with AI...');
  const dialogue = await generateNewsDialogueScript(articles, params.topics);

  if (!dialogue || dialogue.length === 0) {
    throw new Error('Failed to generate news dialogue script');
  }

  console.log(`[Worker] Generated news dialogue with ${dialogue.length} exchanges`);

  // Step 3: Generate audio with ElevenLabs (60%)
  await context.updateProgress(60, 'Creating audio with ElevenLabs (this takes a minute)...');
  const audioBuffer = await generateDialogue(dialogue);

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('Failed to generate audio');
  }

  console.log(`[Worker] Generated audio (${audioBuffer.length} bytes)`);

  // Step 4: Upload to Vultr CDN (80%)
  await context.updateProgress(80, 'Uploading to cloud storage...');
  const audioUrl = await uploadPodcast(audioBuffer, userId, 'news_audio', {
    duration: calculateDuration(audioBuffer),
    articlesCovered: articles.map(a => a.url),
    generatedAt: new Date(),
  });

  console.log(`[Worker] Uploaded news audio to ${audioUrl}`);

  // Step 5: Save metadata (90%)
  await context.updateProgress(90, 'Saving news audio metadata...');
  const transcript = dialogue.map(d => `${d.host.toUpperCase()}: ${d.text}`).join('\n\n');

  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/news-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      audioUrl,
      transcript,
      articlesCovered: articles.map(a => ({ url: a.url, title: a.title })),
      topics: params.topics,
      duration: calculateDuration(audioBuffer),
      generatedAt: new Date(),
    }),
  });

  return {
    audioUrl,
    duration: calculateDuration(audioBuffer),
  };
}

/**
 * Generate dialogue script for news articles
 */
async function generateNewsDialogueScript(
  articles: Array<{ title: string; summary: string; source: string; relevantTopics: string[] }>,
  topics: string[]
): Promise<Array<{ host: string; text: string }>> {
  // Call Claude API to generate news dialogue
  const prompt = `Generate a natural, conversational podcast dialogue between two hosts (Sarah and James) discussing these news articles. Make it engaging, informative, and accessible to everyday citizens.

Topics of interest: ${topics.join(', ')}

Articles to cover:
${articles.map((a, i) => `${i + 1}. ${a.title} (${a.source})
   Summary: ${a.summary}
   Topics: ${a.relevantTopics.join(', ')}`).join('\n\n')}

Format the dialogue as a JSON array:
[
  { "host": "sarah", "text": "Welcome to your personalized news briefing!" },
  { "host": "james", "text": "Let's dive into today's most important stories..." }
]

Make it 7-10 minutes long (approximately 1500-2000 words).`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const dialogueText = data.content[0].text;

  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = dialogueText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse dialogue JSON from Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Calculate audio duration from buffer size
 * MP3 at 192kbps, 44.1kHz = approximately 24KB per second
 */
function calculateDuration(audioBuffer: Buffer): number {
  const bytesPerSecond = 24 * 1024; // 192kbps = 24KB/s
  return Math.round(audioBuffer.length / bytesPerSecond);
}

/**
 * Update job status in KV Cache
 */
async function updateJobStatus(env: any, status: JobStatus): Promise<void> {
  const key = `job:${status.jobId}`;
  await env.KV_CACHE.put(key, JSON.stringify(status), {
    expirationTtl: 3600, // 1 hour
  });

  console.log(`[Worker] Updated status for job ${status.jobId}: ${status.status} (${status.progress}%)`);
}

/**
 * Send notification to user
 */
async function sendNotification(
  env: any,
  notification: {
    userId: string;
    type: string;
    title: string;
    message: string;
    audioUrl?: string;
  }
): Promise<void> {
  // Queue notification for delivery
  await env.NOTIFICATION_QUEUE.send({
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    audioUrl: notification.audioUrl,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Worker] Queued notification for user ${notification.userId}`);
}
