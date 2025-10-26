import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

/**
 * Civic Pulse Raindrop Service
 *
 * This service provides API endpoints for the Civic Pulse application:
 * - Bill tracking and analysis
 * - Representative lookup
 * - User management
 * - AI-powered bill summaries
 *
 * TODO: Complete API implementation after finalizing frontend
 */
export default class extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for Next.js dev server
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint
      if (url.pathname === '/api/health') {
        return this.jsonResponse({
          status: 'ok',
          timestamp: new Date().toISOString(),
          service: 'civic-pulse',
          version: '0.1.0'
        }, corsHeaders);
      }

      // Placeholder endpoints (to be implemented)
      if (url.pathname === '/api/bills') {
        return this.jsonResponse({
          message: 'Bills API - implementation pending',
          status: 'stub'
        }, corsHeaders);
      }

      if (url.pathname === '/api/representatives') {
        return this.jsonResponse({
          message: 'Representatives API - implementation pending',
          status: 'stub'
        }, corsHeaders);
      }

      // Default 404
      return this.jsonResponse({
        error: 'Not Found',
        path: url.pathname
      }, corsHeaders, 404);

    } catch (error) {
      return this.jsonResponse({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, corsHeaders, 500);
    }
  }

  /**
   * Helper: JSON response with CORS headers
   */
  private jsonResponse(data: unknown, corsHeaders: Record<string, string>, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  // Database schema and API methods will be implemented after frontend is complete
  // See journal.md for development progress
}
