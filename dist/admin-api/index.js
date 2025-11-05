globalThis.__RAINDROP_GIT_COMMIT_SHA = "fd4b96b1c7cc72fea75278c189925a9951b725ba"; 

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

// src/admin-api/index.ts
import { Service } from "./runtime.js";
var CIVIC_DB_TABLES = [
  "users",
  "bills",
  "representatives",
  "user_bills",
  "podcasts",
  "rss_articles",
  "vote_records",
  "sync_history",
  "briefs"
];
var ANALYTICS_TABLES = [
  "user_interactions",
  "user_profiles",
  "widget_preferences"
];
var ALL_VALID_TABLES = [...CIVIC_DB_TABLES, ...ANALYTICS_TABLES];
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
var AdminApiService = class extends Service {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    const url = new URL(request.url);
    if (url.pathname === "/api/admin/query" && request.method === "POST") {
      try {
        const body = await request.json();
        const { table, query } = body;
        if (!ALL_VALID_TABLES.includes(table)) {
          return this.jsonResponse({
            error: "Invalid table name",
            validTables: ALL_VALID_TABLES
          }, corsHeaders, 400);
        }
        const isAnalyticsTable = ANALYTICS_TABLES.includes(table);
        const sqlQuery = query || `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 100`;
        let rows;
        if (isAnalyticsTable) {
          const result = await this.env.ANALYTICS.executeQuery({ sqlQuery });
          if (!result.results) {
            rows = [];
          } else {
            rows = JSON.parse(result.results);
          }
        } else {
          const result = await this.env.CIVIC_DB.prepare(sqlQuery).all();
          rows = result.results || [];
        }
        return this.jsonResponse({
          rows,
          count: rows.length,
          table,
          database: isAnalyticsTable ? "ANALYTICS" : "CIVIC_DB"
        }, corsHeaders);
      } catch (error) {
        console.error("Admin API query error:", error);
        return this.jsonResponse({
          error: "Query execution failed",
          message: error instanceof Error ? error.message : "Unknown error",
          rows: []
        }, corsHeaders, 500);
      }
    }
    if (url.pathname === "/api/admin/count" && request.method === "POST") {
      try {
        const body = await request.json();
        const { table } = body;
        if (!ALL_VALID_TABLES.includes(table)) {
          return this.jsonResponse({
            error: "Invalid table name",
            validTables: ALL_VALID_TABLES
          }, corsHeaders, 400);
        }
        const isAnalyticsTable = ANALYTICS_TABLES.includes(table);
        let count;
        if (isAnalyticsTable) {
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
          const result = await this.env.CIVIC_DB.prepare(
            `SELECT COUNT(*) as count FROM ${table}`
          ).all();
          const rows = result.results || [];
          count = rows[0]?.count || 0;
        }
        return this.jsonResponse({
          count,
          table,
          database: isAnalyticsTable ? "ANALYTICS" : "CIVIC_DB"
        }, corsHeaders);
      } catch (error) {
        console.error("Admin API count error:", error);
        return this.jsonResponse({
          error: "Count query failed",
          message: error instanceof Error ? error.message : "Unknown error",
          count: 0
        }, corsHeaders, 500);
      }
    }
    return this.jsonResponse({
      error: "Not found"
    }, corsHeaders, 404);
  }
  jsonResponse(data, headers = {}, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    });
  }
};

// <stdin>
var stdin_default = AdminApiService;
export {
  cors,
  stdin_default as default
};
