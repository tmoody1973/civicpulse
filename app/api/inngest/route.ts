import { serve } from 'inngest/next';
import { inngest } from '../../../src/inngest/client';
import { generateBriefFunction } from '../../../src/inngest/functions/generate-brief';
import { dailyBriefCron } from '../../../src/inngest/functions/daily-brief-cron';
import { generatePersonalizedNewsFunction } from '../../../src/inngest/functions/generate-personalized-news';
import { refreshNewsPoolFunction } from '../../../src/inngest/functions/refresh-news-pool';

/**
 * Inngest Serve Endpoint (Next.js API Route)
 *
 * This is the primary endpoint for Inngest to discover and execute functions.
 * Available at: /api/inngest
 *
 * For local development with Inngest Dev Server (npx inngest-cli dev),
 * it will automatically discover functions at this endpoint.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateBriefFunction,
    dailyBriefCron,
    generatePersonalizedNewsFunction,
    refreshNewsPoolFunction, // Scheduled: Every 6 hours
  ],
});
