/**
 * Procedural Memory Initialization Service
 * POST /api/memory/init
 *
 * Initializes procedural memory with platform usage patterns and guidelines
 *
 * This is a Raindrop service that has access to USER_MEMORY
 * via this.env (injected by Raindrop runtime)
 */

import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Env } from '@/src/web/raindrop.gen';
import { z } from 'zod';
import { initializeProceduralMemory } from '@/lib/memory/procedural-init';

// Request validation schema
const memoryInitSchema = z.object({
  userId: z.string().min(1),
  force: z.boolean().optional().default(false),
});

export default class MemoryInitService extends Service<Env> {
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
      const validatedData = memoryInitSchema.parse(body);

      // ✅ Access Raindrop services via this.env
      const { USER_MEMORY } = this.env;

      // Initialize procedural memory using Phase 1 business logic
      await initializeProceduralMemory(
        USER_MEMORY,
        validatedData.userId,
        validatedData.force
      );

      return this.jsonResponse({
        success: true,
        message: 'Procedural memory initialized successfully',
      }, corsHeaders);

    } catch (error) {
      console.error('Error initializing procedural memory:', error);

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
          error: 'Failed to initialize procedural memory',
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
