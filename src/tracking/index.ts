/**
 * User Interaction Tracking Service
 * POST /api/tracking
 *
 * Tracks user interactions in SmartMemory and SmartSQL
 *
 * This is a Raindrop service that has access to USER_MEMORY and ANALYTICS
 * via this.env (injected by Raindrop runtime)
 */

import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Env } from '@/src/web/raindrop.gen';
import { z } from 'zod';
import { trackInteraction } from '@/lib/tracking/user-interactions';
import type { InteractionType } from '@/lib/tracking/types';

// Request validation schema
const trackingSchema = z.object({
  userId: z.string().min(1),
  interactionType: z.enum([
    'bill_view',
    'bill_track',
    'podcast_listen',
    'podcast_complete',
    'podcast_generate',
    'search',
    'chat_query',
    'news_click',
    'tweet_click',
    'widget_interact',
    'preference_update',
    'page_view',
    'share',
    'download',
  ] as const),
  targetId: z.string().optional(),
  targetType: z.enum(['bill', 'podcast', 'article', 'tweet', 'representative']).optional(),
  metadata: z.record(z.any()).optional(),
  sessionId: z.string().optional(),
});

export default class TrackingService extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    // CORS headers for Next.js dev server
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return this.jsonResponse(
        { error: 'Method not allowed' },
        corsHeaders,
        405
      );
    }

    try {
      // Parse and validate request body
      const body = await request.json();
      const validatedData = trackingSchema.parse(body);

      // ✅ Access Raindrop services via this.env
      const { USER_MEMORY, ANALYTICS } = this.env;

      // Track interaction using Phase 1 business logic
      await trackInteraction(
        USER_MEMORY,
        ANALYTICS,
        {
          userId: validatedData.userId,
          interactionType: validatedData.interactionType as InteractionType,
          targetId: validatedData.targetId,
          targetType: validatedData.targetType,
          metadata: validatedData.metadata,
          timestamp: new Date(),
        },
        {
          sessionId: validatedData.sessionId,
        }
      );

      return this.jsonResponse({
        success: true,
        message: 'Interaction tracked successfully',
      }, corsHeaders);

    } catch (error) {
      console.error('Error tracking interaction:', error);

      if (error instanceof z.ZodError) {
        return this.jsonResponse(
          {
            success: false,
            error: 'Invalid request data',
            details: error.errors,
          },
          corsHeaders,
          400
        );
      }

      return this.jsonResponse(
        {
          success: false,
          error: 'Failed to track interaction',
        },
        corsHeaders,
        500
      );
    }
  }

  /**
   * Helper: JSON response with CORS headers
   */
  private jsonResponse(
    data: unknown,
    corsHeaders: Record<string, string>,
    status = 200
  ): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}
