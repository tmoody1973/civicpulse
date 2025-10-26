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
  private dbInitialized = false;

  /**
   * Initialize database schema on service startup
   */
  async initializeDatabase(): Promise<void> {
    // Create users table
    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          zip_code TEXT,
          state TEXT,
          district TEXT,
          interests TEXT,
          email_notifications BOOLEAN DEFAULT true,
          audio_enabled BOOLEAN DEFAULT true,
          audio_frequencies TEXT,
          subscription_tier TEXT DEFAULT 'free',
          stripe_customer_id TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    });

    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
    });

    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: 'CREATE INDEX IF NOT EXISTS idx_users_zip ON users(zip_code)'
    });

    // Create bills table
    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `
        CREATE TABLE IF NOT EXISTS bills (
          id TEXT PRIMARY KEY,
          congress INTEGER NOT NULL,
          bill_type TEXT NOT NULL,
          bill_number INTEGER NOT NULL,
          title TEXT NOT NULL,
          summary TEXT,
          full_text TEXT,
          sponsor_bioguide_id TEXT,
          sponsor_name TEXT,
          introduced_date TEXT,
          latest_action_date TEXT,
          latest_action_text TEXT,
          status TEXT,
          issue_categories TEXT,
          impact_score INTEGER,
          congress_gov_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(congress, bill_type, bill_number)
        )
      `
    });

    // Create representatives table
    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `
        CREATE TABLE IF NOT EXISTS representatives (
          bioguide_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          party TEXT,
          chamber TEXT NOT NULL,
          state TEXT NOT NULL,
          district TEXT,
          image_url TEXT,
          office_address TEXT,
          phone TEXT,
          website_url TEXT,
          twitter_handle TEXT,
          in_office BOOLEAN DEFAULT true,
          term_start TEXT,
          term_end TEXT,
          committees TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    });

    // Create user_bills tracking table
    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `
        CREATE TABLE IF NOT EXISTS user_bills (
          user_id TEXT NOT NULL,
          bill_id TEXT NOT NULL,
          tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, bill_id)
        )
      `
    });

    // Create podcasts table
    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `
        CREATE TABLE IF NOT EXISTS podcasts (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          audio_url TEXT NOT NULL,
          duration_seconds INTEGER,
          transcript TEXT,
          bills_covered TEXT,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    });

    // Create rss_articles table
    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `
        CREATE TABLE IF NOT EXISTS rss_articles (
          id TEXT PRIMARY KEY,
          feed_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          url TEXT UNIQUE NOT NULL,
          author TEXT,
          published_at TIMESTAMP NOT NULL,
          image_url TEXT,
          categories TEXT,
          fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    });

    // Create vote_records table
    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `
        CREATE TABLE IF NOT EXISTS vote_records (
          id TEXT PRIMARY KEY,
          bill_id TEXT NOT NULL,
          representative_bioguide_id TEXT NOT NULL,
          vote TEXT NOT NULL,
          vote_date TEXT NOT NULL,
          chamber TEXT NOT NULL,
          roll_call_number INTEGER
        )
      `
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Initialize database on first request only
    if (!this.dbInitialized) {
      try {
        await this.initializeDatabase();
        this.dbInitialized = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.env.logger.error('Database initialization error', { error: errorMessage });
      }
    }

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

      // ===== User Management Endpoints =====

      if (url.pathname === '/api/users' && request.method === 'POST') {
        const body = await request.json();
        await this.createUser(body);
        return this.jsonResponse({
          success: true,
          message: 'User created successfully'
        }, corsHeaders);
      }

      if (url.pathname === '/api/users' && request.method === 'GET') {
        const email = url.searchParams.get('email');
        if (!email) {
          return this.jsonResponse({
            error: 'Email parameter required'
          }, corsHeaders, 400);
        }
        const user = await this.getUserByEmail(email);
        return this.jsonResponse(user, corsHeaders);
      }

      if (url.pathname === '/api/users/preferences' && request.method === 'PUT') {
        const body = await request.json();
        const { userId, ...preferences } = body;
        await this.updateUserPreferences(userId, preferences);
        return this.jsonResponse({
          success: true,
          message: 'Preferences updated successfully'
        }, corsHeaders);
      }

      // ===== Bill Endpoints =====

      if (url.pathname === '/api/bills' && request.method === 'POST') {
        const body = await request.json();
        await this.createBill(body);
        return this.jsonResponse({
          success: true,
          message: 'Bill created successfully'
        }, corsHeaders);
      }

      if (url.pathname === '/api/bills' && request.method === 'GET') {
        const category = url.searchParams.get('category');
        const limit = parseInt(url.searchParams.get('limit') || '50');

        const bills = category
          ? await this.getBillsByCategory(category, limit)
          : await this.getRecentBills(limit);

        return this.jsonResponse(bills, corsHeaders);
      }

      // ===== Representative Endpoints =====

      if (url.pathname === '/api/representatives' && request.method === 'POST') {
        const body = await request.json();
        await this.createRepresentative(body);
        return this.jsonResponse({
          success: true,
          message: 'Representative created successfully'
        }, corsHeaders);
      }

      if (url.pathname === '/api/representatives' && request.method === 'GET') {
        const state = url.searchParams.get('state');
        const district = url.searchParams.get('district') || undefined;

        if (!state) {
          return this.jsonResponse({
            error: 'State parameter required'
          }, corsHeaders, 400);
        }

        const reps = await this.getRepresentativesByState(state, district);
        return this.jsonResponse(reps, corsHeaders);
      }

      // ===== RSS Feed Endpoints =====

      if (url.pathname === '/api/rss' && request.method === 'POST') {
        const body = await request.json();
        await this.createRssArticle(body);
        return this.jsonResponse({
          success: true,
          message: 'RSS article saved successfully'
        }, corsHeaders);
      }

      if (url.pathname === '/api/rss' && request.method === 'GET') {
        const feedId = url.searchParams.get('feedId');
        const limit = parseInt(url.searchParams.get('limit') || '20');

        if (!feedId) {
          return this.jsonResponse({
            error: 'feedId parameter required'
          }, corsHeaders, 400);
        }

        const articles = await this.getRssArticlesByFeed(feedId, limit);
        return this.jsonResponse(articles, corsHeaders);
      }

      // ===== Admin Endpoints =====

      if (url.pathname === '/api/admin/query' && request.method === 'POST') {
        const body = await request.json();
        const { table, query } = body;

        // Validate table name for security
        const validTables = ['users', 'bills', 'representatives', 'user_bills', 'podcasts', 'rss_articles', 'vote_records'];

        if (!validTables.includes(table)) {
          return this.jsonResponse({
            error: 'Invalid table name'
          }, corsHeaders, 400);
        }

        const result = await this.env.CIVIC_DB.executeQuery({ sqlQuery: query });

        if (result.results) {
          const rows = JSON.parse(result.results);
          return this.jsonResponse({ rows }, corsHeaders);
        }

        return this.jsonResponse({ rows: [] }, corsHeaders);
      }

      if (url.pathname === '/api/admin/count' && request.method === 'POST') {
        const body = await request.json();
        const { table, query } = body;

        // Validate table name for security
        const validTables = ['users', 'bills', 'representatives', 'user_bills', 'podcasts', 'rss_articles', 'vote_records'];

        if (!validTables.includes(table)) {
          return this.jsonResponse({
            error: 'Invalid table name'
          }, corsHeaders, 400);
        }

        const result = await this.env.CIVIC_DB.executeQuery({ sqlQuery: query });

        if (result.results) {
          const data = JSON.parse(result.results);
          const count = data[0]?.count || 0;
          return this.jsonResponse({ count }, corsHeaders);
        }

        return this.jsonResponse({ count: 0 }, corsHeaders);
      }

      // Default 404
      return this.jsonResponse({
        error: 'Not Found',
        path: url.pathname,
        method: request.method
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

  /**
   * Database Operations - User Management
   */

  async createUser(data: {
    id: string;
    email: string;
    name?: string;
    zipCode?: string;
    interests?: string[];
    emailNotifications?: boolean;
    audioEnabled?: boolean;
    audioFrequencies?: ('daily' | 'weekly')[];
  }): Promise<void> {
    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `INSERT INTO users (
        id, email, name, zip_code, interests,
        email_notifications, audio_enabled, audio_frequencies
      ) VALUES (
        '${data.id}',
        '${data.email}',
        ${data.name ? `'${data.name}'` : 'NULL'},
        ${data.zipCode ? `'${data.zipCode}'` : 'NULL'},
        '${JSON.stringify(data.interests || [])}',
        ${data.emailNotifications ?? true},
        ${data.audioEnabled ?? true},
        '${JSON.stringify(data.audioFrequencies || ['daily', 'weekly'])}'
      )`
    });
  }

  async getUserByEmail(email: string) {
    const result = await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `SELECT * FROM users WHERE email = '${email}' LIMIT 1`
    });

    if (result.results) {
      const data = JSON.parse(result.results);
      return data[0] || null;
    }
    return null;
  }

  async updateUserPreferences(userId: string, preferences: {
    interests?: string[];
    emailNotifications?: boolean;
    audioEnabled?: boolean;
    audioFrequencies?: ('daily' | 'weekly')[];
  }): Promise<void> {
    const updates: string[] = [];

    if (preferences.interests !== undefined) {
      updates.push(`interests = '${JSON.stringify(preferences.interests)}'`);
    }
    if (preferences.emailNotifications !== undefined) {
      updates.push(`email_notifications = ${preferences.emailNotifications}`);
    }
    if (preferences.audioEnabled !== undefined) {
      updates.push(`audio_enabled = ${preferences.audioEnabled}`);
    }
    if (preferences.audioFrequencies !== undefined) {
      updates.push(`audio_frequencies = '${JSON.stringify(preferences.audioFrequencies)}'`);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');

      await this.env.CIVIC_DB.executeQuery({
        sqlQuery: `UPDATE users SET ${updates.join(', ')} WHERE id = '${userId}'`
      });
    }
  }

  /**
   * Database Operations - Bill Management
   */

  async createBill(data: {
    id: string;
    congress: number;
    billType: string;
    billNumber: number;
    title: string;
    summary?: string;
    fullText?: string;
    sponsorBioguideId?: string;
    sponsorName?: string;
    introducedDate?: string;
    latestActionDate?: string;
    latestActionText?: string;
    status?: string;
    issueCategories?: string[];
    impactScore?: number;
    congressGovUrl?: string;
  }): Promise<void> {
    const escapeSql = (str: string) => str.replace(/'/g, "''");

    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `INSERT OR REPLACE INTO bills (
        id, congress, bill_type, bill_number, title, summary, full_text,
        sponsor_bioguide_id, sponsor_name, introduced_date,
        latest_action_date, latest_action_text, status,
        issue_categories, impact_score, congress_gov_url
      ) VALUES (
        '${data.id}',
        ${data.congress},
        '${data.billType}',
        ${data.billNumber},
        '${escapeSql(data.title)}',
        ${data.summary ? `'${escapeSql(data.summary)}'` : 'NULL'},
        ${data.fullText ? `'${escapeSql(data.fullText)}'` : 'NULL'},
        ${data.sponsorBioguideId ? `'${data.sponsorBioguideId}'` : 'NULL'},
        ${data.sponsorName ? `'${escapeSql(data.sponsorName)}'` : 'NULL'},
        ${data.introducedDate ? `'${data.introducedDate}'` : 'NULL'},
        ${data.latestActionDate ? `'${data.latestActionDate}'` : 'NULL'},
        ${data.latestActionText ? `'${escapeSql(data.latestActionText)}'` : 'NULL'},
        '${data.status || 'introduced'}',
        '${JSON.stringify(data.issueCategories || [])}',
        ${data.impactScore || 'NULL'},
        ${data.congressGovUrl ? `'${data.congressGovUrl}'` : 'NULL'}
      )`
    });
  }

  async getBillsByCategory(category: string, limit = 20) {
    const result = await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `SELECT * FROM bills
                 WHERE issue_categories LIKE '%"${category}"%'
                 ORDER BY latest_action_date DESC
                 LIMIT ${limit}`
    });

    if (result.results) {
      const data = JSON.parse(result.results);
      return data.map((row: any) => ({
        ...row,
        issueCategories: JSON.parse(row.issue_categories)
      }));
    }
    return [];
  }

  async getRecentBills(limit = 50) {
    const result = await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `SELECT * FROM bills
                 ORDER BY latest_action_date DESC
                 LIMIT ${limit}`
    });

    if (result.results) {
      const data = JSON.parse(result.results);
      return data.map((row: any) => ({
        ...row,
        issueCategories: JSON.parse(row.issue_categories)
      }));
    }
    return [];
  }

  /**
   * Database Operations - Representative Management
   */

  async createRepresentative(data: {
    bioguideId: string;
    name: string;
    party?: string;
    chamber: 'house' | 'senate';
    state: string;
    district?: string;
    imageUrl?: string;
    officeAddress?: string;
    phone?: string;
    websiteUrl?: string;
    twitterHandle?: string;
    committees?: string[];
  }): Promise<void> {
    const escapeSql = (str: string) => str.replace(/'/g, "''");

    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `INSERT OR REPLACE INTO representatives (
        bioguide_id, name, party, chamber, state, district,
        image_url, office_address, phone, website_url, twitter_handle, committees
      ) VALUES (
        '${data.bioguideId}',
        '${escapeSql(data.name)}',
        ${data.party ? `'${data.party}'` : 'NULL'},
        '${data.chamber}',
        '${data.state}',
        ${data.district ? `'${data.district}'` : 'NULL'},
        ${data.imageUrl ? `'${data.imageUrl}'` : 'NULL'},
        ${data.officeAddress ? `'${escapeSql(data.officeAddress)}'` : 'NULL'},
        ${data.phone ? `'${data.phone}'` : 'NULL'},
        ${data.websiteUrl ? `'${data.websiteUrl}'` : 'NULL'},
        ${data.twitterHandle ? `'${data.twitterHandle}'` : 'NULL'},
        '${JSON.stringify(data.committees || [])}'
      )`
    });
  }

  async getRepresentativesByState(state: string, district?: string) {
    let query = `SELECT * FROM representatives WHERE state = '${state}'`;

    if (district) {
      query += ` AND (district = '${district}' OR chamber = 'senate')`;
    }

    const result = await this.env.CIVIC_DB.executeQuery({ sqlQuery: query });

    if (result.results) {
      const data = JSON.parse(result.results);
      return data.map((row: any) => ({
        ...row,
        committees: JSON.parse(row.committees)
      }));
    }
    return [];
  }

  /**
   * Database Operations - RSS Articles
   */

  async createRssArticle(data: {
    id: string;
    feedId: string;
    title: string;
    description?: string;
    url: string;
    author?: string;
    publishedAt: string;
    imageUrl?: string;
    categories?: string[];
  }): Promise<void> {
    const escapeSql = (str: string) => str.replace(/'/g, "''");

    await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `INSERT OR IGNORE INTO rss_articles (
        id, feed_id, title, description, url, author, published_at, image_url, categories
      ) VALUES (
        '${data.id}',
        '${data.feedId}',
        '${escapeSql(data.title)}',
        ${data.description ? `'${escapeSql(data.description)}'` : 'NULL'},
        '${data.url}',
        ${data.author ? `'${escapeSql(data.author)}'` : 'NULL'},
        '${data.publishedAt}',
        ${data.imageUrl ? `'${data.imageUrl}'` : 'NULL'},
        '${JSON.stringify(data.categories || [])}'
      )`
    });
  }

  async getRssArticlesByFeed(feedId: string, limit = 20) {
    const result = await this.env.CIVIC_DB.executeQuery({
      sqlQuery: `SELECT * FROM rss_articles
                 WHERE feed_id = '${feedId}'
                 ORDER BY published_at DESC
                 LIMIT ${limit}`
    });

    if (result.results) {
      const data = JSON.parse(result.results);
      return data.map((row: any) => ({
        ...row,
        categories: JSON.parse(row.categories)
      }));
    }
    return [];
  }
}
