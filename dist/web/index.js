globalThis.__RAINDROP_GIT_COMMIT_SHA = "5df3173d35cca1ae18e70780d027ff6e48124af1"; 

// node_modules/@liquidmetal-ai/raindrop-framework/dist/core/cors.js
var matchOrigin = (request, env, config) => {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) {
    return null;
  }
  const { origin } = config;
  if (origin === "*") {
    return "*";
  }
  if (typeof origin === "function") {
    return origin(request, env);
  }
  if (typeof origin === "string") {
    return requestOrigin === origin ? origin : null;
  }
  if (Array.isArray(origin)) {
    return origin.includes(requestOrigin) ? requestOrigin : null;
  }
  return null;
};
var addCorsHeaders = (response, request, env, config) => {
  const allowedOrigin = matchOrigin(request, env, config);
  if (!allowedOrigin) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  if (config.credentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  if (config.exposeHeaders && config.exposeHeaders.length > 0) {
    headers.set("Access-Control-Expose-Headers", config.exposeHeaders.join(", "));
  }
  const vary = headers.get("Vary");
  if (vary) {
    if (!vary.includes("Origin")) {
      headers.set("Vary", `${vary}, Origin`);
    }
  } else {
    headers.set("Vary", "Origin");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};
var handlePreflight = (request, env, config) => {
  const allowedOrigin = matchOrigin(request, env, config);
  if (!allowedOrigin) {
    return new Response(null, { status: 403 });
  }
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  if (config.credentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  const allowMethods = config.allowMethods || ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
  headers.set("Access-Control-Allow-Methods", allowMethods.join(", "));
  const allowHeaders = config.allowHeaders || ["Content-Type", "Authorization"];
  headers.set("Access-Control-Allow-Headers", allowHeaders.join(", "));
  const maxAge = config.maxAge ?? 86400;
  headers.set("Access-Control-Max-Age", maxAge.toString());
  headers.set("Vary", "Origin");
  return new Response(null, {
    status: 204,
    headers
  });
};
var createCorsHandler = (config) => {
  return (request, env, response) => {
    if (!response) {
      return handlePreflight(request, env, config);
    }
    return addCorsHeaders(response, request, env, config);
  };
};
var corsAllowAll = createCorsHandler({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: false
});
var corsDisabled = (request, _env, response) => {
  if (!response && request.method === "OPTIONS") {
    return new Response(null, { status: 403 });
  }
  if (!response) {
    throw new Error("corsDisabled called without response for non-OPTIONS request");
  }
  return response;
};

// src/_app/cors.ts
var cors = corsDisabled;

// src/web/index.ts
import { Service } from "./runtime.js";
var web_default = class extends Service {
  constructor() {
    super(...arguments);
    this.dbInitialized = false;
  }
  /**
   * Initialize database schema on service startup
   */
  async initializeDatabase() {
    await this.env.CIVIC_DB.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        zip_code TEXT,
        state TEXT,
        district TEXT,
        interests TEXT,
        onboarding_completed INTEGER DEFAULT 0,
        email_notifications BOOLEAN DEFAULT true,
        audio_enabled BOOLEAN DEFAULT true,
        audio_frequencies TEXT,
        subscription_tier TEXT DEFAULT 'free',
        stripe_customer_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.env.CIVIC_DB.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
    await this.env.CIVIC_DB.exec("CREATE INDEX IF NOT EXISTS idx_users_zip ON users(zip_code)");
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
    await this.env.CIVIC_DB.exec("CREATE INDEX IF NOT EXISTS idx_bills_congress_date ON bills(congress, latest_action_date DESC)");
    await this.env.CIVIC_DB.exec("CREATE INDEX IF NOT EXISTS idx_bills_sponsor ON bills(sponsor_bioguide_id)");
    await this.env.CIVIC_DB.exec("CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status, congress)");
    await this.env.CIVIC_DB.exec("CREATE INDEX IF NOT EXISTS idx_bills_impact ON bills(impact_score DESC, latest_action_date DESC)");
    await this.env.CIVIC_DB.exec("CREATE INDEX IF NOT EXISTS idx_bills_sync ON bills(synced_to_algolia_at)");
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
    try {
      const columnCheck = await this.env.CIVIC_DB.prepare(`PRAGMA table_info(representatives)`).all();
      if (columnCheck.results) {
        const hasRssUrl = columnCheck.results.some((col) => col.name === "rss_url");
        if (!hasRssUrl) {
          console.log("\u{1F504} Migration: Adding rss_url column to representatives table");
          await this.env.CIVIC_DB.exec(`ALTER TABLE representatives ADD COLUMN rss_url TEXT`);
          console.log("\u2705 Migration: rss_url column added successfully");
        } else {
          console.log("\u2705 rss_url column already exists, skipping migration");
        }
      }
    } catch (error) {
      console.warn("\u26A0\uFE0F  Migration warning (rss_url column):", error);
    }
    await this.env.CIVIC_DB.exec(`
      CREATE TABLE IF NOT EXISTS user_bills (
        user_id TEXT NOT NULL,
        bill_id TEXT NOT NULL,
        tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, bill_id)
      )
    `);
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
    await this.env.CIVIC_DB.exec(`
      CREATE TABLE IF NOT EXISTS sync_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_type TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        run_id TEXT,
        run_url TEXT,
        error_message TEXT,
        bills_fetched INTEGER,
        bills_processed INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.env.CIVIC_DB.exec("CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status)");
    await this.env.CIVIC_DB.exec("CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at DESC)");
    await this.env.CIVIC_DB.exec("CREATE INDEX IF NOT EXISTS idx_sync_history_type ON sync_history(sync_type)");
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (!this.dbInitialized) {
      try {
        await this.initializeDatabase();
        this.dbInitialized = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        this.env.logger.error("Database initialization error", { error: errorMessage });
      }
    }
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      if (url.pathname === "/api/health") {
        return this.jsonResponse({
          status: "ok",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          service: "civic-pulse",
          version: "0.1.0"
        }, corsHeaders);
      }
      if (url.pathname === "/api/users" && request.method === "POST") {
        const body = await request.json();
        await this.createUser(body);
        return this.jsonResponse({
          success: true,
          message: "User created successfully"
        }, corsHeaders);
      }
      if (url.pathname === "/api/users" && request.method === "GET") {
        const email = url.searchParams.get("email");
        if (!email) {
          return this.jsonResponse({
            error: "Email parameter required"
          }, corsHeaders, 400);
        }
        const user = await this.getUserByEmail(email);
        return this.jsonResponse(user, corsHeaders);
      }
      if (url.pathname === "/api/users/preferences" && request.method === "PUT") {
        const body = await request.json();
        const { userId, ...preferences } = body;
        await this.updateUserPreferences(userId, preferences);
        return this.jsonResponse({
          success: true,
          message: "Preferences updated successfully"
        }, corsHeaders);
      }
      if (url.pathname === "/api/bills" && request.method === "POST") {
        const body = await request.json();
        await this.createBill(body);
        return this.jsonResponse({
          success: true,
          message: "Bill created successfully"
        }, corsHeaders);
      }
      if (url.pathname === "/api/bills" && request.method === "GET") {
        const id = url.searchParams.get("id");
        const category = url.searchParams.get("category");
        const limit = parseInt(url.searchParams.get("limit") || "50");
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
              error: "Bill not found",
              id
            }, corsHeaders, 404);
          }
          const bill = {
            ...billResult,
            issue_categories: billResult.issue_categories ? JSON.parse(billResult.issue_categories) : []
          };
          return this.jsonResponse({ bill }, corsHeaders);
        }
        const bills = category ? await this.getBillsByCategory(category, limit) : await this.getRecentBills(limit);
        return this.jsonResponse(bills, corsHeaders);
      }
      if (url.pathname === "/api/representatives" && request.method === "POST") {
        const body = await request.json();
        await this.createRepresentative(body);
        return this.jsonResponse({
          success: true,
          message: "Representative created successfully"
        }, corsHeaders);
      }
      if (url.pathname === "/api/representatives" && request.method === "GET") {
        const state = url.searchParams.get("state");
        const district = url.searchParams.get("district") || void 0;
        if (!state) {
          return this.jsonResponse({
            error: "State parameter required"
          }, corsHeaders, 400);
        }
        const reps = await this.getRepresentativesByState(state, district);
        return this.jsonResponse(reps, corsHeaders);
      }
      if (url.pathname === "/api/rss" && request.method === "POST") {
        const body = await request.json();
        await this.createRssArticle(body);
        return this.jsonResponse({
          success: true,
          message: "RSS article saved successfully"
        }, corsHeaders);
      }
      if (url.pathname === "/api/rss" && request.method === "GET") {
        const feedId = url.searchParams.get("feedId");
        const limit = parseInt(url.searchParams.get("limit") || "20");
        if (!feedId) {
          return this.jsonResponse({
            error: "feedId parameter required"
          }, corsHeaders, 400);
        }
        const articles = await this.getRssArticlesByFeed(feedId, limit);
        return this.jsonResponse(articles, corsHeaders);
      }
      if (url.pathname === "/api/admin/query" && request.method === "POST") {
        const body = await request.json();
        const { table, query } = body;
        const validTables = ["users", "bills", "representatives", "user_bills", "podcasts", "rss_articles", "vote_records", "sync_history"];
        if (!validTables.includes(table)) {
          return this.jsonResponse({
            error: "Invalid table name"
          }, corsHeaders, 400);
        }
        const result = await this.env.CIVIC_DB.prepare(query).all();
        return this.jsonResponse({ rows: result.results || [] }, corsHeaders);
      }
      if (url.pathname === "/api/admin/count" && request.method === "POST") {
        const body = await request.json();
        const { table, query } = body;
        const validTables = ["users", "bills", "representatives", "user_bills", "podcasts", "rss_articles", "vote_records", "sync_history"];
        if (!validTables.includes(table)) {
          return this.jsonResponse({
            error: "Invalid table name"
          }, corsHeaders, 400);
        }
        const result = await this.env.CIVIC_DB.prepare(query).first();
        const count = result?.count || 0;
        return this.jsonResponse({ count }, corsHeaders);
      }
      if (url.pathname === "/api/smartbucket/sync" && request.method === "POST") {
        const { limit = 10 } = await request.json().catch(() => ({}));
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
        `).bind(limit).all();
        const synced = [];
        const failed = [];
        for (const bill of bills.results || []) {
          try {
            const textContent = `
=== BILL METADATA ===

Bill Number: ${bill.bill_type.toUpperCase()} ${bill.bill_number}
Congress: ${bill.congress}th Congress
Bill ID: ${bill.id}

Title: ${bill.title}

Sponsor: ${bill.sponsor_name || "Unknown"}${bill.sponsor_party ? ` (${bill.sponsor_party}-${bill.sponsor_state})` : ""}
${bill.sponsor_bioguide_id ? `Sponsor ID: ${bill.sponsor_bioguide_id}` : ""}

Status: ${bill.status}
Introduced: ${bill.introduced_date || "Unknown"}
Latest Action Date: ${bill.latest_action_date || "Unknown"}
Latest Action: ${bill.latest_action_text || "No action recorded"}

Cosponsors: ${bill.cosponsor_count || 0}

${bill.summary ? `=== OFFICIAL SUMMARY ===

${bill.summary}

` : ""}=== FULL BILL TEXT ===

${bill.full_text}
`.trim();
            const documentKey = `bills/${bill.congress}/${bill.bill_type}${bill.bill_number}.txt`;
            await this.env.BILLS_SMARTBUCKET.put(
              documentKey,
              textContent,
              {
                httpMetadata: {
                  contentType: "text/plain"
                }
              }
            );
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
              error: error instanceof Error ? error.message : "Unknown error"
            });
          }
        }
        return this.jsonResponse({
          success: true,
          synced: synced.length,
          failed: failed.length,
          bills: synced,
          errors: failed
        }, corsHeaders);
      }
      if (url.pathname === "/api/smartbucket/search" && request.method === "POST") {
        const { query, limit = 10 } = await request.json();
        if (!query) {
          return this.jsonResponse({
            error: "Query parameter required"
          }, corsHeaders, 400);
        }
        const searchResults = await this.env.BILLS_SMARTBUCKET.search({
          input: query,
          requestId: `search-${Date.now()}`
        });
        return this.jsonResponse({
          success: true,
          query,
          results: searchResults.results.slice(0, limit),
          pagination: searchResults.pagination
        }, corsHeaders);
      }
      if (url.pathname === "/api/smartbucket/chat" && request.method === "POST") {
        const { billId, question } = await request.json();
        if (!billId || !question) {
          return this.jsonResponse({
            error: "billId and question are required"
          }, corsHeaders, 400);
        }
        const billResult = await this.env.CIVIC_DB.prepare(`
          SELECT id, congress, bill_type, bill_number, title, summary, full_text, smartbucket_key
          FROM bills
          WHERE id = ?
        `).bind(billId).first();
        if (!billResult) {
          return this.jsonResponse({
            error: "Bill not found",
            billId
          }, corsHeaders, 404);
        }
        if (!billResult.full_text || !billResult.smartbucket_key) {
          return this.jsonResponse({
            success: false,
            useFallback: true,
            message: "Bill does not have full text yet. Use fallback AI analysis.",
            bill: {
              id: billResult.id,
              title: billResult.title,
              summary: billResult.summary
            }
          }, corsHeaders);
        }
        try {
          const chatResult = await this.env.BILLS_SMARTBUCKET.documentChat({
            objectId: billResult.smartbucket_key,
            input: question,
            requestId: `chat-${Date.now()}`
          });
          return this.jsonResponse({
            success: true,
            billId,
            question,
            answer: chatResult.answer,
            usedFullText: true
          }, corsHeaders);
        } catch (error) {
          return this.jsonResponse({
            success: false,
            useFallback: true,
            message: "SmartBucket chat failed. Use fallback AI analysis.",
            error: error instanceof Error ? error.message : "Unknown error",
            bill: {
              id: billResult.id,
              title: billResult.title,
              summary: billResult.summary
            }
          }, corsHeaders);
        }
      }
      if (url.pathname === "/api/smartbucket/similar" && request.method === "POST") {
        const { billId, limit = 5 } = await request.json();
        if (!billId) {
          return this.jsonResponse({
            error: "billId is required"
          }, corsHeaders, 400);
        }
        const billResult = await this.env.CIVIC_DB.prepare(`
          SELECT id, congress, bill_type, bill_number, title, summary, smartbucket_key
          FROM bills
          WHERE id = ?
        `).bind(billId).first();
        if (!billResult) {
          return this.jsonResponse({
            error: "Bill not found",
            billId
          }, corsHeaders, 404);
        }
        if (!billResult.smartbucket_key) {
          return this.jsonResponse({
            success: false,
            message: "Bill not indexed in SmartBucket yet",
            billId
          }, corsHeaders);
        }
        try {
          const searchQuery = `${billResult.title} ${billResult.summary || ""}`;
          const searchResults = await this.env.BILLS_SMARTBUCKET.search({
            input: searchQuery,
            requestId: `similar-${Date.now()}`
          });
          const billPattern = `${billResult.bill_type}${billResult.bill_number}`;
          const filteredResults = searchResults.results.filter((result) => result.source && !result.source.includes(billPattern)).slice(0, limit);
          const enrichedResults = [];
          for (const result of filteredResults) {
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
                  billNumber: `${billType.toUpperCase()} ${billNumber}`
                });
              }
            }
          }
          return this.jsonResponse({
            success: true,
            billId,
            currentBill: {
              id: billResult.id,
              title: billResult.title,
              billNumber: `${billResult.bill_type.toUpperCase()} ${billResult.bill_number}`
            },
            similarBills: enrichedResults,
            count: enrichedResults.length
          }, corsHeaders);
        } catch (error) {
          return this.jsonResponse({
            success: false,
            message: "Failed to find similar bills",
            error: error instanceof Error ? error.message : "Unknown error"
          }, corsHeaders, 500);
        }
      }
      return this.jsonResponse({
        error: "Not Found",
        path: url.pathname,
        method: request.method
      }, corsHeaders, 404);
    } catch (error) {
      return this.jsonResponse({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }, corsHeaders, 500);
    }
  }
  /**
   * Helper: JSON response with CORS headers
   */
  jsonResponse(data, corsHeaders, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
  /**
   * Database Operations - User Management
   */
  async createUser(data) {
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
      JSON.stringify(data.audioFrequencies || ["daily", "weekly"])
    ).run();
  }
  async getUserByEmail(email) {
    const result = await this.env.CIVIC_DB.prepare(`
      SELECT * FROM users WHERE email = ? LIMIT 1
    `).bind(email).first();
    return result || null;
  }
  async updateUserPreferences(userId, preferences) {
    const updates = [];
    const values = [];
    if (preferences.interests !== void 0) {
      updates.push(`interests = ?`);
      values.push(JSON.stringify(preferences.interests));
    }
    if (preferences.emailNotifications !== void 0) {
      updates.push(`email_notifications = ?`);
      values.push(preferences.emailNotifications);
    }
    if (preferences.audioEnabled !== void 0) {
      updates.push(`audio_enabled = ?`);
      values.push(preferences.audioEnabled);
    }
    if (preferences.audioFrequencies !== void 0) {
      updates.push(`audio_frequencies = ?`);
      values.push(JSON.stringify(preferences.audioFrequencies));
    }
    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(userId);
      await this.env.CIVIC_DB.prepare(`
        UPDATE users SET ${updates.join(", ")} WHERE id = ?
      `).bind(...values).run();
    }
  }
  /**
   * Database Operations - Bill Management
   */
  async createBill(data) {
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
      data.status || "introduced",
      data.policyArea || null,
      JSON.stringify(data.issueCategories || []),
      data.impactScore || null,
      data.cosponsorCount || null,
      JSON.stringify(data.committees || []),
      data.congressGovUrl || null,
      data.searchableText || null
    ).run();
  }
  async getBillsByCategory(category, limit = 20) {
    const result = await this.env.CIVIC_DB.prepare(`
      SELECT * FROM bills
      WHERE issue_categories LIKE ?
      ORDER BY latest_action_date DESC
      LIMIT ?
    `).bind(`%"${category}"%`, limit).all();
    return (result.results || []).map((row) => ({
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
    return (result.results || []).map((row) => ({
      ...row,
      issueCategories: JSON.parse(row.issue_categories)
    }));
  }
  /**
   * Database Operations - Representative Management
   */
  async createRepresentative(data) {
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
  async getRepresentativesByState(state, district) {
    let query = `SELECT * FROM representatives WHERE state = ?`;
    const params = [state];
    if (district) {
      query += ` AND (district = ? OR chamber = 'senate')`;
      params.push(district);
    }
    const result = await this.env.CIVIC_DB.prepare(query).bind(...params).all();
    return (result.results || []).map((row) => ({
      ...row,
      committees: JSON.parse(row.committees)
    }));
  }
  /**
   * Database Operations - RSS Articles
   */
  async createRssArticle(data) {
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
  async getRssArticlesByFeed(feedId, limit = 20) {
    const result = await this.env.CIVIC_DB.prepare(`
      SELECT * FROM rss_articles
      WHERE feed_id = ?
      ORDER BY published_at DESC
      LIMIT ?
    `).bind(feedId, limit).all();
    return (result.results || []).map((row) => ({
      ...row,
      categories: JSON.parse(row.categories)
    }));
  }
};

// <stdin>
var stdin_default = web_default;
export {
  cors,
  stdin_default as default
};
