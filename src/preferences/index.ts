/**
 * User Preferences Service
 * GET/PATCH /api/preferences/profile
 * GET/PATCH /api/preferences/widgets
 *
 * Manages user profile and widget preferences
 *
 * This is a Raindrop service that has access to USER_MEMORY and ANALYTICS
 * via this.env (injected by Raindrop runtime)
 */

import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Env } from '@/src/web/raindrop.gen';
import { z } from 'zod';
import {
  getUserProfile,
  updateUserProfile,
  getWidgetPreferences,
  updateWidgetPreferences,
} from '@/lib/preferences/user-preferences';
import type { WidgetType } from '@/lib/preferences/types';

// Supported language codes (ISO 639-1)
const SUPPORTED_LANGUAGE_CODES = ['en', 'es', 'fr', 'de', 'pt', 'it', 'pl', 'hi', 'ja', 'ko', 'zh', 'ar'] as const;

// Update profile schema
const updateProfileSchema = z.object({
  userId: z.string().min(1),
  updates: z.object({
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    preferredLanguage: z.enum(SUPPORTED_LANGUAGE_CODES).optional(),
    policyInterests: z.array(z.string()).optional(),
    representatives: z.array(z.object({
      bioguideId: z.string(),
      name: z.string(),
      chamber: z.enum(['house', 'senate']),
      state: z.string(),
      district: z.string().nullish(),
      party: z.string(),
    })).optional(),
    location: z.object({
      state: z.string(),
      district: z.string().nullish(),
      city: z.string().nullish(),
      zipCode: z.string().nullish(),
    }).optional(),
    notificationPreferences: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean(),
      billUpdates: z.boolean(),
      representativeActivity: z.boolean(),
      podcastReady: z.boolean(),
      newsAlerts: z.boolean(),
      quietHours: z.object({
        enabled: z.boolean(),
        start: z.string(),
        end: z.string(),
      }),
    }).optional(),
    newsSources: z.array(z.string()).optional(),
    twitterFeedEnabled: z.boolean().optional(),
    twitterFeedFilters: z.object({
      showAllReps: z.boolean(),
      showOnlyMyReps: z.boolean(),
      showHouseOnly: z.boolean(),
      showSenateOnly: z.boolean(),
      specificReps: z.array(z.string()).optional(),
    }).optional(),
    perplexityEnabled: z.boolean().optional(),
    perplexitySettings: z.object({
      suggestQuestions: z.boolean(),
      saveChatHistory: z.boolean(),
      maxTokens: z.number(),
    }).optional(),
    podcastPreferences: z.object({
      autoGenerate: z.boolean(),
      generationTime: z.string().optional(),
      preferredLength: z.enum(['quick', 'standard', 'in-depth']),
      topics: z.array(z.string()),
      focus: z.array(z.string()),
      listeningDays: z.array(z.string()),
    }).optional(),
    learningStyle: z.enum(['quick', 'detailed', 'audio-focused']).optional(),
  }),
  source: z.string().optional().default('settings'),
  metadata: z.record(z.any()).optional(),
});

// Update widget schema
const updateWidgetSchema = z.object({
  userId: z.string().min(1),
  widgetType: z.enum([
    'hero',
    'legislation',
    'twitter',
    'news',
    'podcast-queue',
    'perplexity-chat',
    'civic-impact',
  ] as const),
  updates: z.object({
    isVisible: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
    filterSettings: z.record(z.any()).optional(),
  }),
});

export default class PreferencesService extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for Next.js dev server
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    try {
      // ✅ Access Raindrop services via this.env (including CIVIC_DB for migration)
      const { USER_MEMORY, ANALYTICS, CIVIC_DB } = this.env;

      // Route: GET /api/preferences/profile
      if (url.pathname === '/api/preferences/profile' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');

        if (!userId) {
          return this.jsonResponse(
            {
              success: false,
              error: 'userId is required',
            },
            corsHeaders,
            400
          );
        }

        // ✅ Pass CIVIC_DB to enable automatic migration for existing users
        const profile = await getUserProfile(ANALYTICS, USER_MEMORY, userId, CIVIC_DB);

        if (!profile) {
          return this.jsonResponse(
            {
              success: false,
              error: 'Profile not found',
            },
            corsHeaders,
            404
          );
        }

        return this.jsonResponse({
          success: true,
          profile,
        }, corsHeaders);
      }

      // Route: PATCH /api/preferences/profile
      if (url.pathname === '/api/preferences/profile' && request.method === 'PATCH') {
        const body = await request.json();
        const validatedData = updateProfileSchema.parse(body);

        // Convert null to undefined for TypeScript compatibility
        const updates: any = { ...validatedData.updates };
        if (updates.firstName === null) updates.firstName = undefined;
        if (updates.lastName === null) updates.lastName = undefined;
        if (updates.location) {
          if (updates.location.city === null) updates.location.city = undefined;
          if (updates.location.district === null) updates.location.district = undefined;
          if (updates.location.zipCode === null) updates.location.zipCode = undefined;
        }
        if (updates.representatives) {
          updates.representatives = updates.representatives.map((rep: any) => ({
            ...rep,
            district: rep.district === null ? undefined : rep.district,
          }));
        }

        await updateUserProfile(ANALYTICS, USER_MEMORY, {
          userId: validatedData.userId,
          updates,
          source: validatedData.source,
          metadata: validatedData.metadata,
        });

        // Get updated profile (with CIVIC_DB for potential migration)
        const updatedProfile = await getUserProfile(
          ANALYTICS,
          USER_MEMORY,
          validatedData.userId,
          CIVIC_DB
        );

        return this.jsonResponse({
          success: true,
          message: 'Profile updated successfully',
          profile: updatedProfile,
        }, corsHeaders);
      }

      // Route: GET /api/preferences/widgets
      if (url.pathname === '/api/preferences/widgets' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');

        if (!userId) {
          return this.jsonResponse(
            {
              success: false,
              error: 'userId is required',
            },
            corsHeaders,
            400
          );
        }

        const widgets = await getWidgetPreferences(ANALYTICS, userId);

        return this.jsonResponse({
          success: true,
          widgets,
        }, corsHeaders);
      }

      // Route: PATCH /api/preferences/widgets
      if (url.pathname === '/api/preferences/widgets' && request.method === 'PATCH') {
        const body = await request.json();
        const validatedData = updateWidgetSchema.parse(body);

        await updateWidgetPreferences(
          ANALYTICS,
          validatedData.userId,
          validatedData.widgetType as WidgetType,
          validatedData.updates
        );

        // Get updated widget preferences
        const updatedWidgets = await getWidgetPreferences(ANALYTICS, validatedData.userId);

        return this.jsonResponse({
          success: true,
          message: 'Widget preferences updated successfully',
          widgets: updatedWidgets,
        }, corsHeaders);
      }

      // Default 404
      return this.jsonResponse({
        error: 'Not Found',
        path: url.pathname,
        method: request.method
      }, corsHeaders, 404);

    } catch (error) {
      console.error('Error in preferences service:', error);

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
          error: 'Failed to process preferences request',
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
