/**
 * Admin API Service
 * Provides admin dashboard with access to both CIVIC_DB and ANALYTICS databases
 *
 * Routes:
 * - POST /api/admin/query - Execute SQL query on specified database
 */

import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Env } from '@/src/web/raindrop.gen';

// Table definitions
const CIVIC_DB_TABLES = [
  'users',
  'bills',
  'representatives',
  'user_bills',
  'podcasts',
  'rss_articles',
  'vote_records',
  'sync_history',
  'briefs',
  'news_articles' // Shared news pool (Perplexity via Inngest)
];

const ANALYTICS_TABLES = [
  'user_interactions',
  'user_profiles',
  'widget_preferences'
];

const ALL_VALID_TABLES = [...CIVIC_DB_TABLES, ...ANALYTICS_TABLES];

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default class AdminApiService extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // POST /api/admin/query - Execute query
    if (url.pathname === '/api/admin/query' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { table, query } = body as { table: string; query?: string };

        // Validate table name
        if (!ALL_VALID_TABLES.includes(table)) {
          return this.jsonResponse({
            error: 'Invalid table name',
            validTables: ALL_VALID_TABLES
          }, corsHeaders, 400);
        }

        // Determine which database to query
        const isAnalyticsTable = ANALYTICS_TABLES.includes(table);

        // Default query if not provided
        const sqlQuery = query || `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 100`;

        let rows: any[];

        if (isAnalyticsTable) {
          // SmartSQL uses executeQuery()
          const result = await this.env.ANALYTICS.executeQuery({ sqlQuery });

          if (!result.results) {
            rows = [];
          } else {
            rows = JSON.parse(result.results);
          }
        } else {
          // SqlDatabase uses prepare().all()
          const result = await this.env.HAKIVO_DB.prepare(sqlQuery).all();
          rows = result.results || [];
        }

        return this.jsonResponse({
          rows,
          count: rows.length,
          table,
          database: isAnalyticsTable ? 'ANALYTICS' : 'CIVIC_DB'
        }, corsHeaders);

      } catch (error) {
        console.error('Admin API query error:', error);
        return this.jsonResponse({
          error: 'Query execution failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          rows: []
        }, corsHeaders, 500);
      }
    }

    // POST /api/admin/count - Get table row count
    if (url.pathname === '/api/admin/count' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { table } = body as { table: string };

        // Validate table name
        if (!ALL_VALID_TABLES.includes(table)) {
          return this.jsonResponse({
            error: 'Invalid table name',
            validTables: ALL_VALID_TABLES
          }, corsHeaders, 400);
        }

        // Determine which database to query
        const isAnalyticsTable = ANALYTICS_TABLES.includes(table);

        let count: number;

        if (isAnalyticsTable) {
          // SmartSQL uses executeQuery()
          const result = await this.env.ANALYTICS.executeQuery({
            sqlQuery: `SELECT COUNT(*) as count FROM ${table}`
          });

          if (!result.results) {
            count = 0;
          } else {
            const rows = JSON.parse(result.results);
            count = rows[0]?.count || 0;
          }
        } else {
          // SqlDatabase uses prepare().all()
          const result = await this.env.HAKIVO_DB.prepare(
            `SELECT COUNT(*) as count FROM ${table}`
          ).all();

          const rows = result.results as Array<{ count: number }> || [];
          count = rows[0]?.count || 0;
        }

        return this.jsonResponse({
          count,
          table,
          database: isAnalyticsTable ? 'ANALYTICS' : 'CIVIC_DB'
        }, corsHeaders);

      } catch (error) {
        console.error('Admin API count error:', error);
        return this.jsonResponse({
          error: 'Count query failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          count: 0
        }, corsHeaders, 500);
      }
    }

    return this.jsonResponse({
      error: 'Not found'
    }, corsHeaders, 404);
  }

  private jsonResponse(data: any, headers: Record<string, string> = {}, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }
}
