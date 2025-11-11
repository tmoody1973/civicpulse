globalThis.__RAINDROP_GIT_COMMIT_SHA = "d1ae57f18adae2ce7b0b9c57e09b23ccb53ceeff"; 

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

// src/test-service/index.ts
import { Service } from "./runtime.js";
var test_service_default = class extends Service {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/test-brief") {
      try {
        const testJob = {
          userId: "test-user-123",
          userEmail: "test@example.com",
          userName: "Test User",
          state: "CA",
          district: "12",
          policyInterests: ["Healthcare", "Education", "Climate"],
          forceRegenerate: false
        };
        console.log("\u{1F4E4} Sending test message to brief-queue:", JSON.stringify(testJob, null, 2));
        await this.env.BRIEF_QUEUE.send(testJob, {
          contentType: "json"
        });
        return new Response(JSON.stringify({
          success: true,
          message: "Test message sent to brief-queue",
          jobData: testJob
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("\u274C Failed to send test message:", error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/test-news") {
      try {
        const testJob = {
          userId: "test-user-456",
          userEmail: "test@example.com",
          interests: ["Technology", "Politics"],
          state: "NY",
          district: "15",
          limit: 10,
          forceRefresh: false
        };
        console.log("\u{1F4E4} Sending test message to news-queue:", JSON.stringify(testJob, null, 2));
        await this.env.NEWS_QUEUE.send(testJob, {
          contentType: "json"
        });
        return new Response(JSON.stringify({
          success: true,
          message: "Test message sent to news-queue",
          jobData: testJob
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("\u274C Failed to send test message:", error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/create-news-table") {
      try {
        console.log("\u{1F528} Creating news_articles table...");
        const result = await this.env.HAKIVO_DB.exec(`
          CREATE TABLE IF NOT EXISTS news_articles (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT NOT NULL UNIQUE,
            summary TEXT NOT NULL,
            source TEXT NOT NULL,
            published_date TEXT NOT NULL,
            relevant_topics TEXT NOT NULL,
            image_url TEXT,
            image_alt TEXT,
            image_photographer TEXT,
            image_photographer_url TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );

          CREATE INDEX IF NOT EXISTS idx_news_articles_topics_date
            ON news_articles(relevant_topics, published_date DESC, created_at DESC);

          CREATE INDEX IF NOT EXISTS idx_news_articles_created
            ON news_articles(created_at);

          CREATE INDEX IF NOT EXISTS idx_news_articles_url
            ON news_articles(url);
        `);
        console.log("\u2705 news_articles table created successfully");
        return new Response(JSON.stringify({
          success: true,
          message: "news_articles table created successfully",
          result
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("\u274C Failed to create table:", error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    return new Response(JSON.stringify({
      message: "Test service ready",
      endpoints: {
        "/test-brief": "Send test message to brief-queue",
        "/test-news": "Send test message to news-queue",
        "/create-news-table": "Create news_articles table in CIVIC_DB"
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

// <stdin>
var stdin_default = test_service_default;
export {
  cors,
  stdin_default as default
};
