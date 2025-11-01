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
    await this.env.CIVIC_DB.exec(`
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
    `);

    await this.env.CIVIC_DB.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await this.env.CIVIC_DB.exec('CREATE INDEX IF NOT EXISTS idx_users_zip ON users(zip_code)');

    // Create bills table with enhanced metadata fields
    await this.env.CIVIC_DB.exec(`
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
        sponsor_party TEXT,
        sponsor_state TEXT,
        introduced_date TEXT NOT NULL,
        latest_action_date TEXT NOT NULL,
        latest_action_text TEXT,
        status TEXT NOT NULL,
        issue_categories TEXT,
        impact_score INTEGER DEFAULT 0,
        cosponsor_count INTEGER DEFAULT 0,
        cosponsors TEXT,
        congress_url TEXT,
        synced_to_algolia_at DATETIME,
        synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(congress, bill_type, bill_number)
      )
    `);

    // Create indexes for bills table
    await this.env.CIVIC_DB.exec('CREATE INDEX IF NOT EXISTS idx_bills_congress_date ON bills(congress, latest_action_date DESC)');
    await this.env.CIVIC_DB.exec('CREATE INDEX IF NOT EXISTS idx_bills_sponsor ON bills(sponsor_bioguide_id)');
    await this.env.CIVIC_DB.exec('CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status, congress)');
    await this.env.CIVIC_DB.exec('CREATE INDEX IF NOT EXISTS idx_bills_impact ON bills(impact_score DESC, latest_action_date DESC)');
    await this.env.CIVIC_DB.exec('CREATE INDEX IF NOT EXISTS idx_bills_sync ON bills(synced_to_algolia_at)');

    // Create representatives table
    await this.env.CIVIC_DB.exec(`
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
        rss_url TEXT,
        contact_form TEXT,
        twitter_handle TEXT,
        facebook_url TEXT,
        youtube_url TEXT,
        instagram_handle TEXT,
        in_office BOOLEAN DEFAULT true,
        term_start TEXT,
        term_end TEXT,
        committees TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: Add rss_url column if it doesn't exist
    // Check if column exists by querying table info
    try {
      const columnCheck = await this.env.CIVIC_DB.prepare(`PRAGMA table_info(representatives)`).all();

      if (columnCheck.results) {
        const hasRssUrl = columnCheck.results.some((col: any) => col.name === 'rss_url');

        if (!hasRssUrl) {
          console.log('🔄 Migration: Adding rss_url column to representatives table');
          await this.env.CIVIC_DB.exec(`ALTER TABLE representatives ADD COLUMN rss_url TEXT`);
          console.log('✅ Migration: rss_url column added successfully');
        } else {
          console.log('✅ rss_url column already exists, skipping migration');
        }
      }
    } catch (error) {
      console.warn('⚠️  Migration warning (rss_url column):', error);
      // If migration fails, it might be because the column already exists
      // or table doesn't exist yet - this is okay, we can continue
    }

    // Create user_bills tracking table
    await this.env.CIVIC_DB.exec(`
      CREATE TABLE IF NOT EXISTS user_bills (
        user_id TEXT NOT NULL,
        bill_id TEXT NOT NULL,
        tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, bill_id)
      )
    `);

    // Create podcasts table
    await this.env.CIVIC_DB.exec(`
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
    `);

    // Create rss_articles table
    await this.env.CIVIC_DB.exec(`
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
    `);

    // Create vote_records table
    await this.env.CIVIC_DB.exec(`
      CREATE TABLE IF NOT EXISTS vote_records (
        id TEXT PRIMARY KEY,
        bill_id TEXT NOT NULL,
        representative_bioguide_id TEXT NOT NULL,
        vote TEXT NOT NULL,
        vote_date TEXT NOT NULL,
        chamber TEXT NOT NULL,
        roll_call_number INTEGER
      )
    `);
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
        const id = url.searchParams.get('id');
        const category = url.searchParams.get('category');
        const limit = parseInt(url.searchParams.get('limit') || '50');

        // If ID is provided, fetch single bill with sponsor details
        if (id) {
          const billResult = await this.env.CIVIC_DB.prepare(`
            SELECT
              b.*,
              r.party as sponsor_party,
              r.state as sponsor_state,
              r.image_url as sponsor_image_url,
              r.office_address as sponsor_office_address,
              r.phone as sponsor_phone,
              r.website_url as sponsor_website_url,
              r.contact_url as sponsor_contact_url,
              r.twitter_handle as sponsor_twitter_handle,
              r.facebook_url as sponsor_facebook_url
            FROM bills b
            LEFT JOIN representatives r ON b.sponsor_bioguide_id = r.bioguide_id
            WHERE b.id = ?
          `).bind(id).first();

          if (!billResult) {
            return this.jsonResponse({
              error: 'Bill not found',
              id,
            }, corsHeaders, 404);
          }

          // Parse JSON fields
          const bill = {
            ...billResult,
            issue_categories: billResult.issue_categories ? JSON.parse(billResult.issue_categories as string) : [],
          };

          return this.jsonResponse({ bill }, corsHeaders);
        }

        // Otherwise fetch bills by category or recent
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

        const result = await this.env.CIVIC_DB.prepare(query).all();

        return this.jsonResponse({ rows: result.results || [] }, corsHeaders);
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

        const result = await this.env.CIVIC_DB.prepare(query).first<{ count: number }>();

        const count = result?.count || 0;
        return this.jsonResponse({ count }, corsHeaders);
      }

      // SmartBucket sync endpoint
      if (url.pathname === '/api/smartbucket/sync' && request.method === 'POST') {
        const { limit = 10 } = await request.json().catch(() => ({}));

        // Get bills with full_text that haven't been synced yet (fetch ALL metadata)
        const bills = await this.env.CIVIC_DB.prepare(`
          SELECT
            b.id, b.congress, b.bill_type, b.bill_number, b.title, b.summary, b.full_text,
            b.sponsor_name, b.sponsor_bioguide_id,
            r.party as sponsor_party, r.state as sponsor_state,
            b.introduced_date, b.latest_action_date, b.latest_action_text,
            b.status, b.cosponsor_count
          FROM bills b
          LEFT JOIN representatives r ON b.sponsor_bioguide_id = r.bioguide_id
          WHERE b.full_text IS NOT NULL
            AND b.smartbucket_key IS NULL
          LIMIT ?
        `).bind(limit).all<{
          id: string;
          congress: number;
          bill_type: string;
          bill_number: number;
          title: string;
          summary: string | null;
          full_text: string;
          sponsor_name: string | null;
          sponsor_party: string | null;
          sponsor_state: string | null;
          sponsor_bioguide_id: string | null;
          introduced_date: string | null;
          latest_action_date: string | null;
          latest_action_text: string | null;
          status: string;
          cosponsor_count: number;
        }>();

        const synced: string[] = [];
        const failed: { id: string; error: string }[] = [];

        for (const bill of bills.results || []) {
          try {
            // Create comprehensive plain text document with ALL metadata
            // This allows the RAG system to answer questions about sponsor, dates, status, etc.
            const textContent = `
=== BILL METADATA ===

Bill Number: ${bill.bill_type.toUpperCase()} ${bill.bill_number}
Congress: ${bill.congress}th Congress
Bill ID: ${bill.id}

Title: ${bill.title}

Sponsor: ${bill.sponsor_name || 'Unknown'}${bill.sponsor_party ? ` (${bill.sponsor_party}-${bill.sponsor_state})` : ''}
${bill.sponsor_bioguide_id ? `Sponsor ID: ${bill.sponsor_bioguide_id}` : ''}

Status: ${bill.status}
Introduced: ${bill.introduced_date || 'Unknown'}
Latest Action Date: ${bill.latest_action_date || 'Unknown'}
Latest Action: ${bill.latest_action_text || 'No action recorded'}

Cosponsors: ${bill.cosponsor_count || 0}

${bill.summary ? `=== OFFICIAL SUMMARY ===\n\n${bill.summary}\n\n` : ''}=== FULL BILL TEXT ===

${bill.full_text}
`.trim();

            const documentKey = `bills/${bill.congress}/${bill.bill_type}${bill.bill_number}.txt`;

            // Upload as plain text so SmartBucket can index it
            await this.env.BILLS_SMARTBUCKET.put(
              documentKey,
              textContent,
              {
                httpMetadata: {
                  contentType: 'text/plain',
                },
              }
            );

            // Update database with sync info
            await this.env.CIVIC_DB.prepare(`
              UPDATE bills
              SET smartbucket_key = ?,
                  synced_to_smartbucket_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).bind(documentKey, bill.id).run();

            synced.push(bill.id);
          } catch (error) {
            failed.push({
              id: bill.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        return this.jsonResponse({
          success: true,
          synced: synced.length,
          failed: failed.length,
          bills: synced,
          errors: failed,
        }, corsHeaders);
      }

      // SmartBucket search endpoint
      if (url.pathname === '/api/smartbucket/search' && request.method === 'POST') {
        const { query, limit = 10 } = await request.json();

        if (!query) {
          return this.jsonResponse({
            error: 'Query parameter required',
          }, corsHeaders, 400);
        }

        // Search SmartBucket with semantic search
        const searchResults = await this.env.BILLS_SMARTBUCKET.search({
          input: query,
          requestId: `search-${Date.now()}`,
        });

        return this.jsonResponse({
          success: true,
          query,
          results: searchResults.results.slice(0, limit),
          pagination: searchResults.pagination,
        }, corsHeaders);
      }

      // SmartBucket documentChat endpoint - chat with a specific bill
      if (url.pathname === '/api/smartbucket/chat' && request.method === 'POST') {
        const { billId, question } = await request.json();

        if (!billId || !question) {
          return this.jsonResponse({
            error: 'billId and question are required',
          }, corsHeaders, 400);
        }

        // Get bill from database to check if it has full text
        const billResult = await this.env.CIVIC_DB.prepare(`
          SELECT id, congress, bill_type, bill_number, title, summary, full_text, smartbucket_key
          FROM bills
          WHERE id = ?
        `).bind(billId).first();

        if (!billResult) {
          return this.jsonResponse({
            error: 'Bill not found',
            billId,
          }, corsHeaders, 404);
        }

        // Check if bill has full text and is synced to SmartBucket
        if (!billResult.full_text || !billResult.smartbucket_key) {
          return this.jsonResponse({
            success: false,
            useFallback: true,
            message: 'Bill does not have full text yet. Use fallback AI analysis.',
            bill: {
              id: billResult.id,
              title: billResult.title,
              summary: billResult.summary,
            },
          }, corsHeaders);
        }

        try {
          // Use SmartBucket documentChat for bills with full text
          const chatResult = await this.env.BILLS_SMARTBUCKET.documentChat({
            objectId: billResult.smartbucket_key as string,
            input: question,
            requestId: `chat-${Date.now()}`,
          });

          return this.jsonResponse({
            success: true,
            billId,
            question,
            answer: chatResult.answer,
            usedFullText: true,
          }, corsHeaders);
        } catch (error) {
          // If SmartBucket chat fails, indicate fallback needed
          return this.jsonResponse({
            success: false,
            useFallback: true,
            message: 'SmartBucket chat failed. Use fallback AI analysis.',
            error: error instanceof Error ? error.message : 'Unknown error',
            bill: {
              id: billResult.id,
              title: billResult.title,
              summary: billResult.summary,
            },
          }, corsHeaders);
        }
      }

      // SmartBucket similar bills endpoint - find semantically similar bills
      if (url.pathname === '/api/smartbucket/similar' && request.method === 'POST') {
        const { billId, limit = 5 } = await request.json();

        if (!billId) {
          return this.jsonResponse({
            error: 'billId is required',
          }, corsHeaders, 400);
        }

        // Get current bill
        const billResult = await this.env.CIVIC_DB.prepare(`
          SELECT id, congress, bill_type, bill_number, title, summary, smartbucket_key
          FROM bills
          WHERE id = ?
        `).bind(billId).first();

        if (!billResult) {
          return this.jsonResponse({
            error: 'Bill not found',
            billId,
          }, corsHeaders, 404);
        }

        if (!billResult.smartbucket_key) {
          return this.jsonResponse({
            success: false,
            message: 'Bill not indexed in SmartBucket yet',
            billId,
          }, corsHeaders);
        }

        try {
          // Search using bill's title + summary as query
          const searchQuery = `${billResult.title} ${billResult.summary || ''}`;

          const searchResults = await this.env.BILLS_SMARTBUCKET.search({
            input: searchQuery,
            requestId: `similar-${Date.now()}`,
          });

          // Filter out the current bill from results and limit
          const billPattern = `${billResult.bill_type}${billResult.bill_number}`;
          const filteredResults = searchResults.results
            .filter(result => result.source && !result.source.includes(billPattern))
            .slice(0, limit);

          // Enrich with bill metadata from database
          const enrichedResults = [];
          for (const result of filteredResults) {
            // Extract bill info from source (e.g., "bills/119/hr220.txt")
            const match = result.source?.match(/bills\/(\d+)\/([a-z]+)(\d+)\.txt/);
            if (match) {
              const [, congress, billType, billNumber] = match;
              const bill = await this.env.CIVIC_DB.prepare(`
                SELECT id, title, summary, sponsor_name, sponsor_party, sponsor_state,
                       status, introduced_date, latest_action_text
                FROM bills
                WHERE congress = ? AND bill_type = ? AND bill_number = ?
              `).bind(congress, billType, billNumber).first();

              if (bill) {
                enrichedResults.push({
                  ...bill,
                  similarity: result.score,
                  billNumber: `${billType.toUpperCase()} ${billNumber}`,
                });
              }
            }
          }

          return this.jsonResponse({
            success: true,
            billId,
            currentBill: {
              id: billResult.id as string,
              title: billResult.title as string,
              billNumber: `${(billResult.bill_type as string).toUpperCase()} ${billResult.bill_number}`,
            },
            similarBills: enrichedResults,
            count: enrichedResults.length,
          }, corsHeaders);
        } catch (error) {
          return this.jsonResponse({
            success: false,
            message: 'Failed to find similar bills',
            error: error instanceof Error ? error.message : 'Unknown error',
          }, corsHeaders, 500);
        }
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
    await this.env.CIVIC_DB.prepare(`
      INSERT INTO users (
        id, email, name, zip_code, interests,
        email_notifications, audio_enabled, audio_frequencies
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.id,
      data.email,
      data.name || null,
      data.zipCode || null,
      JSON.stringify(data.interests || []),
      data.emailNotifications ?? true,
      data.audioEnabled ?? true,
      JSON.stringify(data.audioFrequencies || ['daily', 'weekly'])
    ).run();
  }

  async getUserByEmail(email: string) {
    const result = await this.env.CIVIC_DB.prepare(`
      SELECT * FROM users WHERE email = ? LIMIT 1
    `).bind(email).first();

    return result || null;
  }

  async updateUserPreferences(userId: string, preferences: {
    interests?: string[];
    emailNotifications?: boolean;
    audioEnabled?: boolean;
    audioFrequencies?: ('daily' | 'weekly')[];
  }): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (preferences.interests !== undefined) {
      updates.push(`interests = ?`);
      values.push(JSON.stringify(preferences.interests));
    }
    if (preferences.emailNotifications !== undefined) {
      updates.push(`email_notifications = ?`);
      values.push(preferences.emailNotifications);
    }
    if (preferences.audioEnabled !== undefined) {
      updates.push(`audio_enabled = ?`);
      values.push(preferences.audioEnabled);
    }
    if (preferences.audioFrequencies !== undefined) {
      updates.push(`audio_frequencies = ?`);
      values.push(JSON.stringify(preferences.audioFrequencies));
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);

      await this.env.CIVIC_DB.prepare(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
      `).bind(...values).run();
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
    sponsorParty?: string;
    sponsorState?: string;
    sponsorDistrict?: string;
    introducedDate?: string;
    latestActionDate?: string;
    latestActionText?: string;
    status?: string;
    policyArea?: string;
    issueCategories?: string[];
    impactScore?: number;
    cosponsorCount?: number;
    committees?: string[];
    congressGovUrl?: string;
    searchableText?: string;
  }): Promise<void> {
    await this.env.CIVIC_DB.prepare(`
      INSERT OR REPLACE INTO bills (
        id, congress, bill_type, bill_number, title, summary, full_text,
        sponsor_bioguide_id, sponsor_name, sponsor_party, sponsor_state, sponsor_district,
        introduced_date, latest_action_date, latest_action_text, status,
        policy_area, issue_categories, impact_score, cosponsor_count, committees,
        congress_url, searchable_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.id,
      data.congress,
      data.billType,
      data.billNumber,
      data.title,
      data.summary || null,
      data.fullText || null,
      data.sponsorBioguideId || null,
      data.sponsorName || null,
      data.sponsorParty || null,
      data.sponsorState || null,
      data.sponsorDistrict || null,
      data.introducedDate || null,
      data.latestActionDate || null,
      data.latestActionText || null,
      data.status || 'introduced',
      data.policyArea || null,
      JSON.stringify(data.issueCategories || []),
      data.impactScore || null,
      data.cosponsorCount || null,
      JSON.stringify(data.committees || []),
      data.congressGovUrl || null,
      data.searchableText || null
    ).run();
  }

  async getBillsByCategory(category: string, limit = 20) {
    const result = await this.env.CIVIC_DB.prepare(`
      SELECT * FROM bills
      WHERE issue_categories LIKE ?
      ORDER BY latest_action_date DESC
      LIMIT ?
    `).bind(`%"${category}"%`, limit).all();

    return (result.results || []).map((row: any) => ({
      ...row,
      issueCategories: JSON.parse(row.issue_categories)
    }));
  }

  async getRecentBills(limit = 50) {
    const result = await this.env.CIVIC_DB.prepare(`
      SELECT * FROM bills
      ORDER BY latest_action_date DESC
      LIMIT ?
    `).bind(limit).all();

    return (result.results || []).map((row: any) => ({
      ...row,
      issueCategories: JSON.parse(row.issue_categories)
    }));
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
    rssUrl?: string;
    contactForm?: string;
    twitterHandle?: string;
    facebookUrl?: string;
    youtubeUrl?: string;
    instagramHandle?: string;
    committees?: string[];
  }): Promise<void> {
    await this.env.CIVIC_DB.prepare(`
      INSERT OR REPLACE INTO representatives (
        bioguide_id, name, party, chamber, state, district,
        image_url, office_address, phone, website_url, twitter_handle, committees,
        rss_url, contact_url, facebook_url, youtube_url, instagram_handle
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.bioguideId,
      data.name,
      data.party || null,
      data.chamber,
      data.state,
      data.district || null,
      data.imageUrl || null,
      data.officeAddress || null,
      data.phone || null,
      data.websiteUrl || null,
      data.twitterHandle || null,
      JSON.stringify(data.committees || []),
      data.rssUrl || null,
      data.contactForm || null,
      data.facebookUrl || null,
      data.youtubeUrl || null,
      data.instagramHandle || null
    ).run();
  }

  async getRepresentativesByState(state: string, district?: string) {
    let query = `SELECT * FROM representatives WHERE state = ?`;
    const params: any[] = [state];

    if (district) {
      query += ` AND (district = ? OR chamber = 'senate')`;
      params.push(district);
    }

    const result = await this.env.CIVIC_DB.prepare(query).bind(...params).all();

    return (result.results || []).map((row: any) => ({
      ...row,
      committees: JSON.parse(row.committees)
    }));
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
    await this.env.CIVIC_DB.prepare(`
      INSERT OR IGNORE INTO rss_articles (
        id, feed_id, title, description, url, author, published_at, image_url, categories
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.id,
      data.feedId,
      data.title,
      data.description || null,
      data.url,
      data.author || null,
      data.publishedAt,
      data.imageUrl || null,
      JSON.stringify(data.categories || [])
    ).run();
  }

  async getRssArticlesByFeed(feedId: string, limit = 20) {
    const result = await this.env.CIVIC_DB.prepare(`
      SELECT * FROM rss_articles
      WHERE feed_id = ?
      ORDER BY published_at DESC
      LIMIT ?
    `).bind(feedId, limit).all();

    return (result.results || []).map((row: any) => ({
      ...row,
      categories: JSON.parse(row.categories)
    }));
  }
}
