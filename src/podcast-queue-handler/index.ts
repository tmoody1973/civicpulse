/**
 * Podcast Queue Handler (Raindrop Observer)
 *
 * Processes podcast generation jobs from the podcast-generation-queue.
 * Handles both daily (5-7 min) and weekly (15-18 min) podcast formats.
 *
 * Flow:
 * 1. Receive job from queue
 * 2. Update podcast-generator actor with "processing" status
 * 3. Execute generation pipeline:
 *    - Fetch bills from Congress API
 *    - Generate dialogue script with Claude
 *    - Generate audio with ElevenLabs text-to-dialogue
 *    - Upload to Vultr CDN
 * 4. Update actor with result (success or failure)
 * 5. Queue notification for user
 *
 * Retry: 3 attempts with exponential backoff (1min, 2min, 4min)
 */

import { Each, Message } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

// Job types
type JobType = 'daily' | 'weekly';

// Job payload
export interface Body {
  jobId: string;
  userId: string;
  type: JobType;
  billCount?: number;  // Number of bills to cover (default: 3 for daily, 8 for weekly)
  topics?: string[];   // Optional: filter bills by topics
  createdAt: string;   // ISO timestamp
}

// Job result
interface JobResult {
  jobId: string;
  status: 'success' | 'failed';
  audioUrl?: string;
  duration?: number;
  billsCovered?: string[];
  error?: string;
  completedAt: string;
}

export default class PodcastQueueHandler extends Each<Body, Env> {
  async process(message: Message<Body>): Promise<void> {
    const { jobId, userId, type, billCount, topics } = message.body;
    const startTime = Date.now();

    console.log(`[PodcastQueue] Processing job ${jobId} (user: ${userId}, type: ${type})`);

    try {
      // 1. Update actor status to "processing"
      await this.updateActorStatus(userId, jobId, 'processing', 0);

      // 2. Fetch bills (20% progress)
      await this.updateActorStatus(userId, jobId, 'processing', 20, 'Fetching congressional bills...');
      const bills = await this.fetchBills(type, billCount);

      if (!bills || bills.length === 0) {
        throw new Error('No bills available for podcast generation');
      }

      console.log(`[PodcastQueue] Fetched ${bills.length} bills for job ${jobId}`);

      // 3. Generate dialogue script (40% progress)
      await this.updateActorStatus(userId, jobId, 'processing', 40, 'Generating dialogue script with AI...');
      const dialogue = await this.generateScript(bills, type);

      if (!dialogue || dialogue.length === 0) {
        throw new Error('Failed to generate dialogue script');
      }

      console.log(`[PodcastQueue] Generated ${dialogue.length} dialogue exchanges for job ${jobId}`);

      // 4. Generate audio (60% progress)
      await this.updateActorStatus(userId, jobId, 'processing', 60, 'Creating audio (this takes 1-2 minutes)...');
      const audioBuffer = await this.generateAudio(dialogue);

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Failed to generate audio');
      }

      const duration = this.calculateDuration(audioBuffer);
      console.log(`[PodcastQueue] Generated ${audioBuffer.length} bytes audio (${duration}s) for job ${jobId}`);

      // 5. Upload to Vultr CDN (80% progress)
      await this.updateActorStatus(userId, jobId, 'processing', 80, 'Uploading to cloud storage...');
      const audioUrl = await this.uploadAudio(audioBuffer, userId, type, bills, duration);

      console.log(`[PodcastQueue] Uploaded audio to ${audioUrl} for job ${jobId}`);

      // 6. Save to database (90% progress)
      await this.updateActorStatus(userId, jobId, 'processing', 90, 'Saving podcast metadata...');
      await this.savePodcastMetadata(userId, type, audioUrl, dialogue, bills, duration);

      // 7. Update actor to "complete" (100% progress)
      const latency = Date.now() - startTime;
      console.log(`[PodcastQueue] Job ${jobId} completed in ${latency}ms`);

      await this.updateActorStatus(userId, jobId, 'complete', 100, 'Podcast ready!', {
        audioUrl,
        duration,
        billsCovered: bills.map(b => `${b.billType}${b.billNumber}`),
      });

      // 8. Queue notification
      await this.queueNotification(userId, {
        type: 'podcast_ready',
        title: 'Your podcast is ready!',
        message: `Your ${type} podcast is ready to listen.`,
        audioUrl,
      });

    } catch (error: any) {
      console.error(`[PodcastQueue] Job ${jobId} failed:`, error);

      // Update actor to "failed"
      await this.updateActorStatus(userId, jobId, 'failed', 0, 'Podcast generation failed', {
        error: error.message,
      });

      // Re-throw to trigger queue retry
      throw error;
    }
  }

  /**
   * Update podcast-generator actor status
   */
  private async updateActorStatus(
    userId: string,
    jobId: string,
    status: 'processing' | 'complete' | 'failed',
    progress: number,
    message?: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      // Get actor instance for this user
      const actorId = this.env.PODCAST_GENERATOR.idFromName(userId);
      const actor = this.env.PODCAST_GENERATOR.get(actorId);

      // Call actor's updateStatus method
      await actor.fetch(new Request('http://internal/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          status,
          progress,
          message,
          ...data,
        }),
      }));
    } catch (error) {
      console.error(`[PodcastQueue] Failed to update actor status:`, error);
      // Don't throw - actor updates are non-critical
    }
  }

  /**
   * Fetch bills from Congress API
   */
  private async fetchBills(type: JobType, billCount?: number): Promise<any[]> {
    const limit = billCount || (type === 'daily' ? 3 : 8);

    // Call Next.js API route (deployed on Netlify)
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bills/recent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        congress: 119,
        limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bills: ${response.status}`);
    }

    const data = await response.json();
    return data.bills || [];
  }

  /**
   * Generate dialogue script with Claude
   */
  private async generateScript(bills: any[], type: JobType): Promise<any[]> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: type === 'daily' ? 2000 : 5000,
        messages: [
          {
            role: 'user',
            content: this.buildScriptPrompt(bills, type),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const dialogueText = data.content[0].text;

    // Extract JSON from response (may be wrapped in markdown)
    const jsonMatch = dialogueText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse dialogue JSON from Claude response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Build Claude prompt for dialogue script
   */
  private buildScriptPrompt(bills: any[], type: JobType): string {
    const targetLength = type === 'daily' ? '5-7 minutes' : '15-18 minutes';
    const wordCount = type === 'daily' ? '1000-1200 words' : '2500-3000 words';

    return `Create a natural, conversational podcast dialogue between two hosts (Sarah and James) discussing these congressional bills. Make it engaging, informative, and accessible to everyday citizens.

Bills to cover:
${bills.map((b, i) => `${i + 1}. ${b.billType}${b.billNumber}: ${b.title}\n   Sponsor: ${b.sponsorName}\n   Summary: ${b.title}`).join('\n\n')}

Format: Return ONLY a JSON array with no markdown formatting:
[
  { "host": "sarah", "text": "Welcome to today's congressional update!" },
  { "host": "james", "text": "Let's dive into the bills that matter most..." }
]

Guidelines:
- Sarah introduces topics, James adds context and analysis
- Use contractions and natural speech patterns
- Include acknowledgments ("That's right", "Exactly", "Interesting point")
- Explain bills in plain language - no jargon
- Target length: ${targetLength} (approximately ${wordCount})
- Make it conversational and engaging, like NPR hosts`;
  }

  /**
   * Generate audio with ElevenLabs text-to-dialogue
   */
  private async generateAudio(dialogue: any[]): Promise<Buffer> {
    const inputs = dialogue.map(entry => ({
      text: entry.text,
      voice_id: entry.host === 'sarah'
        ? process.env.ELEVENLABS_SARAH_VOICE_ID!
        : process.env.ELEVENLABS_JAMES_VOICE_ID!,
    }));

    const response = await fetch(
      'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_192',
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          inputs,
          model_id: 'eleven_monolingual_v1',
          settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    return Buffer.from(audioBuffer);
  }

  /**
   * Upload audio to Vultr CDN
   */
  private async uploadAudio(
    audioBuffer: Buffer,
    userId: string,
    type: JobType,
    bills: any[],
    duration: number
  ): Promise<string> {
    // Call Next.js API route to upload (it has S3 credentials)
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/storage/upload-podcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: audioBuffer.toString('base64'),
        userId,
        type,
        metadata: {
          duration,
          billsCovered: bills.map(b => `${b.billType}${b.billNumber}`),
          generatedAt: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return data.audioUrl;
  }

  /**
   * Save podcast metadata to SmartSQL database
   */
  private async savePodcastMetadata(
    userId: string,
    type: JobType,
    audioUrl: string,
    dialogue: any[],
    bills: any[],
    duration: number
  ): Promise<void> {
    const transcript = dialogue.map(d => `${d.host.toUpperCase()}: ${d.text}`).join('\n\n');

    // Call Next.js API route to save to database
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/podcasts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type,
        audioUrl,
        transcript,
        billsCovered: bills.map(b => ({
          id: `${b.billType}${b.billNumber}`,
          title: b.title,
          sponsor: b.sponsorName,
        })),
        duration,
        generatedAt: new Date().toISOString(),
      }),
    });
  }

  /**
   * Queue notification for user
   */
  private async queueNotification(userId: string, notification: any): Promise<void> {
    await this.env.USER_NOTIFICATIONS.send({
      userId,
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Calculate audio duration from buffer size
   * MP3 at 192kbps, 44.1kHz = approximately 24KB per second
   */
  private calculateDuration(audioBuffer: Buffer): number {
    const bytesPerSecond = 24 * 1024; // 192kbps = 24KB/s
    return Math.round(audioBuffer.length / bytesPerSecond);
  }
}
