/**
 * Podcast Generator Actor (Per-User State + Job Processing)
 *
 * Simplified architecture - Actor handles both state management AND processing:
 * 1. Receives job submissions via /submit-job
 * 2. Processes jobs in background (unlimited execution time)
 * 3. Tracks progress and status
 * 4. Stores generation history
 *
 * No queue needed - direct communication from Next.js → Actor
 */

import { Actor, ActorState } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen.js';

// Job types
type JobType = 'daily' | 'weekly';

// Job status
interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  progress: number;
  message: string;
  audioUrl?: string;
  duration?: number;
  billsCovered?: string[];
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// User preferences
interface UserPreferences {
  voiceSpeed?: number;
  podcastLength?: 'short' | 'medium' | 'long';
  topics?: string[];
}

// Actor state shape
interface PodcastGeneratorState {
  currentJob?: JobStatus;
  history: JobStatus[];
  preferences: UserPreferences;
}

export class PodcastGenerator extends Actor<Env> {
  private data: PodcastGeneratorState;

  constructor(state: ActorState, env: Env) {
    super(state, env);

    this.data = {
      history: [],
      preferences: {},
    };
  }

  /**
   * Handle HTTP requests to actor
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // NEW: Submit job endpoint (replaces queue)
      if (path === '/submit-job' && request.method === 'POST') {
        return await this.handleSubmitJob(request);
      }

      // Existing endpoints
      if (path === '/update-status' && request.method === 'POST') {
        return await this.handleUpdateStatus(request);
      }

      if (path === '/status' && request.method === 'GET') {
        return await this.handleGetStatus(request);
      }

      if (path === '/history' && request.method === 'GET') {
        return await this.handleGetHistory(request);
      }

      if (path === '/preferences' && request.method === 'GET') {
        return await this.handleGetPreferences(request);
      }

      if (path === '/preferences' && request.method === 'PUT') {
        return await this.handleUpdatePreferences(request);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error: any) {
      console.error('[PodcastGenerator] Request failed:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Load state from storage
   */
  private async loadState(): Promise<void> {
    const stored = await this.state.storage.get('data');
    if (stored) {
      this.data = stored as PodcastGeneratorState;
    }
  }

  /**
   * NEW: Submit job for processing (replaces queue submission)
   */
  private async handleSubmitJob(request: Request): Promise<Response> {
    await this.loadState();

    const payload = await request.json() as {
      jobId: string;
      userId: string;
      type: JobType;
      billCount?: number;
      topics?: string[];
    };

    console.log(`[PodcastGenerator] Received job ${payload.jobId} for user ${payload.userId}`);

    // Initialize job status as "queued"
    const jobStatus: JobStatus = {
      jobId: payload.jobId,
      status: 'queued',
      progress: 0,
      message: 'Job queued for processing...',
      createdAt: new Date().toISOString(),
    };

    this.data.currentJob = jobStatus;
    await this.state.storage.put('data', this.data);

    // Process job in background (fire-and-forget - don't await)
    this.processJob(payload).catch(err => {
      console.error(`[PodcastGenerator] Background job processing error:`, err);
    });

    // Return immediately
    return new Response(
      JSON.stringify({
        success: true,
        jobId: payload.jobId,
        message: 'Job submitted successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Process podcast generation job (background execution)
   */
  private async processJob(payload: {
    jobId: string;
    userId: string;
    type: JobType;
    billCount?: number;
    topics?: string[];
  }): Promise<void> {
    const { jobId, userId, type, billCount } = payload;
    const startTime = Date.now();

    try {
      console.log(`[PodcastGenerator] Starting job ${jobId}`);

      // 1. Update status to "processing"
      await this.updateStatus(jobId, 'processing', 0, 'Starting podcast generation...');

      // 2. Fetch bills (20% progress)
      await this.updateStatus(jobId, 'processing', 20, 'Fetching congressional bills...');
      const bills = await this.fetchBills(type, billCount);

      if (!bills || bills.length === 0) {
        throw new Error('No bills available');
      }

      // 3. Generate dialogue script (40% progress)
      await this.updateStatus(jobId, 'processing', 40, 'Generating dialogue script...');
      const dialogue = await this.generateScript(bills, type);

      if (!dialogue || dialogue.length === 0) {
        throw new Error('Failed to generate dialogue');
      }

      // 4. Generate audio (60% progress)
      await this.updateStatus(jobId, 'processing', 60, 'Creating audio (1-2 minutes)...');
      const audioBuffer = await this.generateAudio(dialogue);

      const duration = this.calculateDuration(audioBuffer);

      // 5. Upload to Vultr CDN (80% progress)
      await this.updateStatus(jobId, 'processing', 80, 'Uploading to cloud...');
      const audioUrl = await this.uploadAudio(audioBuffer, userId, type, bills, duration);

      // 6. Save metadata (90% progress)
      await this.updateStatus(jobId, 'processing', 90, 'Saving metadata...');
      await this.savePodcastMetadata(userId, type, audioUrl, dialogue, bills, duration);

      // 7. Complete (100% progress)
      const latency = Date.now() - startTime;
      console.log(`[PodcastGenerator] Job ${jobId} completed in ${latency}ms`);

      await this.updateStatus(jobId, 'complete', 100, 'Podcast ready!', {
        audioUrl,
        duration,
        billsCovered: bills.map((b: any) => `${b.billType}${b.billNumber}`),
      });

    } catch (error: any) {
      console.error(`[PodcastGenerator] Job ${jobId} failed:`, error);
      await this.updateStatus(jobId, 'failed', 0, 'Generation failed', {
        error: error.message,
      });
    }
  }

  /**
   * Update job status (internal method)
   */
  private async updateStatus(
    jobId: string,
    status: 'processing' | 'complete' | 'failed',
    progress: number,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.loadState();

    const jobStatus: JobStatus = {
      jobId,
      status,
      progress,
      message,
      ...data,
      createdAt: this.data.currentJob?.createdAt || new Date().toISOString(),
      completedAt: (status === 'complete' || status === 'failed')
        ? new Date().toISOString()
        : undefined,
    };

    this.data.currentJob = jobStatus;

    // If complete/failed, add to history
    if (status === 'complete' || status === 'failed') {
      this.data.history.unshift(jobStatus);
      this.data.history = this.data.history.slice(0, 10);
    }

    await this.state.storage.put('data', this.data);
  }

  /**
   * Fetch bills from Congress API
   */
  private async fetchBills(type: JobType, billCount?: number): Promise<any[]> {
    const limit = billCount || (type === 'daily' ? 3 : 8);

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bills/recent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ congress: 119, limit }),
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

    // Extract JSON
    const jsonMatch = dialogueText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse dialogue JSON');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Build Claude prompt
   */
  private buildScriptPrompt(bills: any[], type: JobType): string {
    const targetLength = type === 'daily' ? '5-7 minutes' : '15-18 minutes';
    const wordCount = type === 'daily' ? '1000-1200 words' : '2500-3000 words';

    return `Create a natural, conversational podcast dialogue between two hosts (Sarah and James) discussing these congressional bills.

Bills to cover:
${bills.map((b, i) => `${i + 1}. ${b.billType}${b.billNumber}: ${b.title}\n   Sponsor: ${b.sponsorName}`).join('\n\n')}

Format: Return ONLY a JSON array:
[
  { "host": "sarah", "text": "Welcome to today's update!" },
  { "host": "james", "text": "Let's dive into the bills..." }
]

Guidelines:
- Natural speech patterns with contractions
- Plain language explanations
- Target: ${targetLength} (${wordCount})
- Make it conversational like NPR`;
  }

  /**
   * Generate audio with ElevenLabs
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
          settings: { stability: 0.5, similarity_boost: 0.75 },
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
   * Save podcast metadata
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
   * Calculate audio duration
   */
  private calculateDuration(audioBuffer: Buffer): number {
    const bytesPerSecond = 24 * 1024; // 192kbps = 24KB/s
    return Math.round(audioBuffer.length / bytesPerSecond);
  }

  // ===== EXISTING ENDPOINTS (Keep for compatibility) =====

  /**
   * Update job status (called externally - kept for compatibility)
   */
  private async handleUpdateStatus(request: Request): Promise<Response> {
    await this.loadState();

    const payload = await request.json() as {
      jobId: string;
      status: 'queued' | 'processing' | 'complete' | 'failed';
      progress: number;
      message?: string;
      audioUrl?: string;
      duration?: number;
      billsCovered?: string[];
      error?: string;
    };

    const jobStatus: JobStatus = {
      jobId: payload.jobId,
      status: payload.status,
      progress: payload.progress,
      message: payload.message || '',
      audioUrl: payload.audioUrl,
      duration: payload.duration,
      billsCovered: payload.billsCovered,
      error: payload.error,
      createdAt: this.data.currentJob?.createdAt || new Date().toISOString(),
      completedAt: (payload.status === 'complete' || payload.status === 'failed')
        ? new Date().toISOString()
        : undefined,
    };

    this.data.currentJob = jobStatus;

    if (payload.status === 'complete' || payload.status === 'failed') {
      this.data.history.unshift(jobStatus);
      this.data.history = this.data.history.slice(0, 10);
    }

    await this.state.storage.put('data', this.data);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Get current job status
   */
  private async handleGetStatus(_request: Request): Promise<Response> {
    await this.loadState();

    return new Response(
      JSON.stringify({
        currentJob: this.data.currentJob || null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Get generation history
   */
  private async handleGetHistory(_request: Request): Promise<Response> {
    await this.loadState();

    return new Response(
      JSON.stringify({
        history: this.data.history,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Get user preferences
   */
  private async handleGetPreferences(_request: Request): Promise<Response> {
    await this.loadState();

    return new Response(
      JSON.stringify({
        preferences: this.data.preferences,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Update user preferences
   */
  private async handleUpdatePreferences(request: Request): Promise<Response> {
    await this.loadState();

    const preferences = await request.json() as UserPreferences;

    this.data.preferences = {
      ...this.data.preferences,
      ...preferences,
    };

    await this.state.storage.put('data', this.data);

    return new Response(
      JSON.stringify({
        success: true,
        preferences: this.data.preferences,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
