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

// src/data-fetcher-worker/index.ts
import { Each } from "./runtime.js";
var data_fetcher_worker_default = class extends Each {
  async process(message) {
    console.log(`\u{1F4CA} Data Fetcher: Processing job ${message.body.jobId}`);
    const { jobId, policyInterests, userId } = message.body;
    try {
      console.log("   Fetching bills from civic-db...");
      const bills = await this.fetchBills(policyInterests);
      console.log(`   \u2705 Fetched ${bills.length} bills`);
      console.log("   Fetching news from Brave Search...");
      const news = await this.fetchNews(policyInterests);
      console.log(`   \u2705 Fetched ${news.length} news articles`);
      await this.env.BRIEF_JOB_STORAGE.put(`job:${jobId}:bills`, JSON.stringify(bills));
      await this.env.BRIEF_JOB_STORAGE.put(`job:${jobId}:news`, JSON.stringify(news));
      console.log("   \u2705 Stored data in bucket storage");
      await this.env.SCRIPT_QUEUE.send({ jobId, userId }, { contentType: "json" });
      console.log("   \u2705 Sent to script-queue");
      message.ack();
    } catch (error) {
      console.error(`\u274C Data fetcher failed: ${error.message}`);
      message.retry({ delaySeconds: 60 });
    }
  }
  async fetchBills(interests) {
    const interestConditions = interests.map(
      (interest) => `issue_categories LIKE '%${interest}%'`
    ).join(" OR ");
    const query = `
      SELECT
        id,
        title,
        summary,
        plain_english_summary,
        issue_categories,
        impact_score,
        latest_action_date,
        bill_number
      FROM bills
      WHERE (${interestConditions})
      AND latest_action_date >= datetime('now', '-30 days')
      ORDER BY impact_score DESC
      LIMIT 2
    `;
    const result = await this.env.HAKIVO_DB.prepare(query).all();
    return result.results || [];
  }
  async fetchNews(interests) {
    const query = interests.join(" OR ") + " news legislation";
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&freshness=pw`,
      {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": this.env.BRAVE_SEARCH_API_KEY
        }
      }
    );
    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status}`);
    }
    const data = await response.json();
    const results = data.web?.results || [];
    return results.map((article) => ({
      title: article.title || article.name,
      url: article.url,
      description: article.description?.substring(0, 200)
    }));
  }
};

// <stdin>
var stdin_default = data_fetcher_worker_default;
export {
  cors,
  stdin_default as default
};
