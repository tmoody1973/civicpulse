/**
 * Queue API Service
 *
 * HTTP endpoint for Next.js (Netlify) to submit jobs to Raindrop queues.
 * This bridges the gap between Netlify-hosted Next.js and Raindrop workers.
 *
 * Endpoints:
 * - POST /submit-podcast-job: Submit podcast generation job
 * - GET  /job-status/:jobId: Get job status from podcast-generator actor
 */

import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

// Job types
type JobType = 'daily' | 'weekly';

// Job submission payload
interface PodcastJobPayload {
  jobId: string;
  userId: string;
  type: JobType;
  billCount?: number;
  topics?: string[];
}

export default class QueueAPIService extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    // Extract env immediately to avoid binding issues
    const env = this.env;

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // CORS headers for cross-origin requests from Next.js/Netlify
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*', // TODO: Restrict to NEXT_PUBLIC_APP_URL in production
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      // Handle OPTIONS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // Route: Submit podcast job - INLINE to avoid method binding issues
      if (path === '/submit-podcast-job' && request.method === 'POST') {
        try {
          const payload = await request.json() as PodcastJobPayload;

          // Validate
          if (!payload.jobId || !payload.userId || !payload.type) {
            return new Response(
              JSON.stringify({ error: 'Missing required fields: jobId, userId, type' }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          console.log(`[QueueAPI] Submitting job ${payload.jobId}`);

          // Call Actor directly - no method extraction
          const actorId = env.PODCAST_GENERATOR.idFromName(payload.userId);
          const actor = env.PODCAST_GENERATOR.get(actorId);

          await actor.fetch(new Request('http://internal/submit-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: payload.jobId,
              userId: payload.userId,
              type: payload.type,
              billCount: payload.billCount,
              topics: payload.topics,
            }),
          }));

          console.log(`[QueueAPI] Job ${payload.jobId} submitted`);

          return new Response(
            JSON.stringify({ success: true, jobId: payload.jobId }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        } catch (error: any) {
          console.error('[QueueAPI] Submit failed:', error);
          return new Response(
            JSON.stringify({ error: `Failed to submit job: ${error.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
      }

      // Route: Get job status
      if (path.startsWith('/job-status/') && request.method === 'GET') {
        const jobId = path.split('/job-status/')[1];
        const response = await this.getJobStatus(jobId, url.searchParams.get('userId') || '');
        return new Response(response.body, {
          status: response.status,
          headers: { ...response.headers, ...corsHeaders },
        });
      }

      return new Response('Not Found', {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    } catch (error: any) {
      console.error('[QueueAPI] Request failed:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Submit podcast generation job to queue
   */
  private async submitPodcastJob(request: Request): Promise<Response> {
    // Extract env early to avoid `this` binding issues
    const env = this.env;

    try {
      const payload = await request.json() as PodcastJobPayload;

      // Validate payload
      if (!payload.jobId || !payload.userId || !payload.type) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: jobId, userId, type' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[QueueAPI] Submitting podcast job ${payload.jobId} for user ${payload.userId}`);

      // Submit directly to Actor - call methods on owner object (no extraction!)
      try {
        // ✅ Call methods directly on env.PODCAST_GENERATOR - no destructuring or binding
        const actorId = env.PODCAST_GENERATOR.idFromName(payload.userId);
        const actor = env.PODCAST_GENERATOR.get(actorId);

        await actor.fetch(new Request('http://internal/submit-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: payload.jobId,
            userId: payload.userId,
            type: payload.type,
            billCount: payload.billCount,
            topics: payload.topics,
          }),
        }));

        console.log(`[QueueAPI] Job ${payload.jobId} submitted to Actor successfully`);
      } catch (actorError: any) {
        console.error('[QueueAPI] Actor communication failed:', actorError);
        throw new Error(`Actor submission failed: ${actorError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          jobId: payload.jobId,
          message: 'Job submitted successfully',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('[QueueAPI] Failed to submit job:', error);
      return new Response(
        JSON.stringify({ error: `Failed to submit job: ${error.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Get job status from podcast-generator actor
   */
  private async getJobStatus(jobId: string, userId: string): Promise<Response> {
    try {
      if (!jobId || !userId) {
        return new Response(
          JSON.stringify({ error: 'Missing jobId or userId parameter' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get actor instance
      const actorId = this.env.PODCAST_GENERATOR.idFromName(userId);
      const actor = this.env.PODCAST_GENERATOR.get(actorId);

      // Query actor for status
      const response = await actor.fetch(new Request('http://internal/status', {
        method: 'GET',
      }));

      const data = await response.json() as { currentJob: any };

      // Check if this is the requested job
      if (data.currentJob && data.currentJob.jobId === jobId) {
        return new Response(
          JSON.stringify(data.currentJob),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Job not found or already completed
      return new Response(
        JSON.stringify({ error: 'Job not found or already completed' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('[QueueAPI] Failed to get job status:', error);
      return new Response(
        JSON.stringify({ error: `Failed to get job status: ${error.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}
