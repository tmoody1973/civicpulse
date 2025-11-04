/**
 * Podcast Queue Handler Observer
 *
 * Processes podcast generation jobs from the queue
 * Watches: podcast-generation-queue
 *
 * Process:
 * 1. Fetch bill data from SmartSQL
 * 2. Generate dialogue script with Claude
 * 3. Generate audio with ElevenLabs text-to-dialogue
 * 4. Upload to Vultr CDN
 * 5. Update actor with result
 * 6. Send notification
 */

import {
  Each,
  Message,
  ActorNamespace,
  Queue,
  SqlDatabase,
} from '@liquidmetal-ai/raindrop-framework';
import { PodcastRequest } from '../types';
import { generateDialogueScript } from '@/lib/ai/claude';
import { generateDialogue, estimateAudioDuration } from '@/lib/ai/elevenlabs';
import { uploadPodcast } from '@/lib/storage/vultr';

interface Env {
  PODCAST_GENERATOR: ActorNamespace<any>;
  USER_NOTIFICATIONS: Queue;
  CIVIC_DB: SqlDatabase;
  ANTHROPIC_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  VULTR_ACCESS_KEY: string;
  VULTR_SECRET_KEY: string;
  VULTR_CDN_URL: string;
}

export default class PodcastQueueHandler extends Each<PodcastRequest, Env> {
  async process(message: Message<PodcastRequest>): Promise<void> {
    const job = message.body;

    console.log(
      `[PodcastQueueHandler] Processing job ${job.id} for user ${job.userId}`
    );

    try {
      // Get actor to update status
      const actorId = this.env.PODCAST_GENERATOR.idFromName(job.userId);
      const actor = this.env.PODCAST_GENERATOR.get(actorId);

      // STEP 1: Update to processing
      await actor.updateStatus(job.id, {
        status: 'processing',
        startedAt: Date.now(),
      });

      // STEP 2: Fetch bill data
      console.log(`[PodcastQueueHandler] Fetching ${job.bills.length} bills`);
      const bills = await this.fetchBills(job.bills);

      if (bills.length === 0) {
        throw new Error('No bills found');
      }

      // STEP 3-5: Generate podcast (stub for now - implement actual generation later)
      console.log(`[PodcastQueueHandler] Generating podcast for ${job.id}`);
      const result = await this.generatePodcast(job, bills);

      // STEP 6: Update actor with success
      await actor.updateStatus(job.id, {
        status: 'completed',
        audioUrl: result.audioUrl,
        transcript: result.transcript,
        duration: result.duration,
        completedAt: Date.now(),
      });

      // STEP 7: Send notification
      await this.env.USER_NOTIFICATIONS.send({
        userId: job.userId,
        type: 'podcast_ready',
        title: `Your ${job.type} brief is ready!`,
        message: `Your personalized podcast covering ${bills.length} ${
          bills.length === 1 ? 'bill' : 'bills'
        } is ready to listen.`,
        data: {
          podcastId: job.id,
          audioUrl: result.audioUrl,
          duration: result.duration,
          billCount: bills.length,
        },
        read: false,
        createdAt: Date.now(),
      });

      // Acknowledge successful processing
      message.ack();

      console.log(
        `[PodcastQueueHandler] ✅ Completed podcast ${job.id} in ${
          Date.now() - job.timestamp
        }ms`
      );
    } catch (error: any) {
      console.error(
        `[PodcastQueueHandler] ❌ Failed to generate podcast ${job.id}:`,
        error
      );

      // Update actor with failure
      try {
        const actorId = this.env.PODCAST_GENERATOR.idFromName(job.userId);
        const actor = this.env.PODCAST_GENERATOR.get(actorId);

        await actor.updateStatus(job.id, {
          status: 'failed',
          error: error.message || 'Unknown error',
          completedAt: Date.now(),
        });
      } catch (updateError) {
        console.error(
          '[PodcastQueueHandler] Failed to update actor status:',
          updateError
        );
      }

      // Retry logic with exponential backoff
      if (message.attempts < 3) {
        const delaySeconds = Math.pow(2, message.attempts) * 60; // 1min, 2min, 4min
        message.retry({ delaySeconds });
        console.log(
          `[PodcastQueueHandler] Retrying in ${delaySeconds}s (attempt ${
            message.attempts + 1
          }/3)`
        );
      } else {
        // Max retries exceeded - acknowledge to prevent infinite loop
        message.ack();
        console.error(
          `[PodcastQueueHandler] Max retries exceeded for podcast ${job.id}`
        );

        // Send failure notification
        try {
          await this.env.USER_NOTIFICATIONS.send({
            userId: job.userId,
            type: 'podcast_failed',
            title: 'Podcast generation failed',
            message: 'We encountered an error generating your podcast. Please try again.',
            data: {
              podcastId: job.id,
              error: error.message,
            },
            read: false,
            createdAt: Date.now(),
          });
        } catch (notifyError) {
          console.error(
            '[PodcastQueueHandler] Failed to send error notification:',
            notifyError
          );
        }
      }
    }
  }

  /**
   * Fetch bills from SmartSQL database
   */
  private async fetchBills(billIds: string[]): Promise<any[]> {
    const bills = [];

    for (const billId of billIds) {
      try {
        const result = await this.env.CIVIC_DB.prepare(
          'SELECT * FROM bills WHERE id = ?'
        )
          .bind(billId)
          .all();

        if (result.results && result.results.length > 0) {
          bills.push(result.results[0]);
        } else {
          console.warn(`[PodcastQueueHandler] Bill not found: ${billId}`);
        }
      } catch (error) {
        console.error(
          `[PodcastQueueHandler] Error fetching bill ${billId}:`,
          error
        );
      }
    }

    return bills;
  }

  /**
   * Generate podcast with Claude + ElevenLabs + Vultr
   */
  private async generatePodcast(
    job: PodcastRequest,
    bills: any[]
  ): Promise<{
    audioUrl: string;
    transcript: string;
    duration: number;
  }> {
    console.log(
      `[PodcastQueueHandler] 🎬 Starting podcast generation for ${job.id}`
    );
    console.log(
      `[PodcastQueueHandler]    Type: ${job.type}, Bills: ${bills.length}`
    );

    // STEP 1: Generate dialogue script with Claude
    console.log(`[PodcastQueueHandler] 📝 Generating dialogue script...`);
    const dialogue = await generateDialogueScript(bills, job.type);
    console.log(
      `[PodcastQueueHandler] ✅ Generated ${dialogue.length} dialogue lines`
    );

    // STEP 2: Generate audio with ElevenLabs
    console.log(`[PodcastQueueHandler] 🎙️  Generating audio with ElevenLabs...`);
    const audioBuffer = await generateDialogue(dialogue);
    console.log(
      `[PodcastQueueHandler] ✅ Generated audio: ${Math.round(
        audioBuffer.length / 1024
      )} KB`
    );

    // STEP 3: Calculate duration
    const duration = estimateAudioDuration(dialogue);
    console.log(
      `[PodcastQueueHandler] ⏱️  Estimated duration: ${Math.round(
        duration / 60
      )} minutes`
    );

    // STEP 4: Upload to Vultr CDN
    console.log(`[PodcastQueueHandler] ☁️  Uploading to Vultr CDN...`);
    const audioUrl = await uploadPodcast(audioBuffer, {
      userId: job.userId,
      type: job.type,
      duration,
      billsCovered: bills.map((b) => b.id),
      generatedAt: new Date(),
    });
    console.log(`[PodcastQueueHandler] ✅ Uploaded to: ${audioUrl}`);

    // STEP 5: Generate transcript
    const transcript = dialogue
      .map((line) => `${line.host.toUpperCase()}: ${line.text}`)
      .join('\n\n');

    return {
      audioUrl,
      transcript,
      duration,
    };
  }
}
