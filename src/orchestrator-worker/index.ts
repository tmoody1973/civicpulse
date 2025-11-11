/**
 * Orchestrator Worker (Step 1 of 5)
 *
 * Creates job ID, stores initial request in SmartMemory, sends to data-queue
 * Minimal memory footprint - only handles coordination
 */

import { Each, Message } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

interface BriefJobData {
  userId: string;
  userEmail: string;
  userName?: string | null;
  state?: string | null;
  district?: string | null;
  policyInterests: string[];
  forceRegenerate: boolean;
}

interface JobMetadata extends BriefJobData {
  jobId: string;
  createdAt: string;
  status: 'pending';
}

export default class extends Each<BriefJobData, Env> {
  async process(message: Message<BriefJobData>): Promise<void> {
    console.log('🎬 Orchestrator: Starting brief generation pipeline');

    const job = message.body;
    const jobId = `brief-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`   Job ID: ${jobId}`);
    console.log(`   User: ${job.userEmail}`);
    console.log(`   Interests: ${job.policyInterests.join(', ')}`);

    try {
      // Store job metadata in SmartMemory for all workers to access
      const metadata: JobMetadata = {
        ...job,
        jobId,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      await this.env.BRIEF_JOB_STORAGE.put(`job:${jobId}:metadata`, JSON.stringify(metadata));
      console.log('   ✅ Stored job metadata in SmartMemory');

      // Send to data-queue
      await this.env.DATA_QUEUE.send({
        jobId,
        userId: job.userId,
        policyInterests: job.policyInterests,
        state: job.state,
        district: job.district
      }, {
        contentType: 'json'
      });

      console.log('   ✅ Sent to data-queue for data fetching');
      message.ack();

    } catch (error: any) {
      console.error('❌ Orchestrator failed:', error.message);
      message.retry({ delaySeconds: 60 });
    }
  }
}

export interface Body extends BriefJobData {}
