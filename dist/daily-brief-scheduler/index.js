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

// src/daily-brief-scheduler/index.ts
import { Task } from "./runtime.js";
var DailyBriefScheduler = class extends Task {
  async handle(event) {
    const startTime = Date.now();
    console.log(`
\u{1F305} Daily brief scheduler triggered at ${new Date(event.scheduledTime).toISOString()}`);
    console.log(`   Cron expression: ${event.cron}`);
    try {
      console.log("\n\u{1F4CA} Querying active users from database...");
      const query = `
        SELECT id, email, name, state, district, interests
        FROM users
        WHERE email IS NOT NULL
        ORDER BY created_at DESC
      `;
      const result = await this.env.HAKIVO_DB.prepare(query).all();
      const users = result.results;
      console.log(`   Found ${users.length} users`);
      if (users.length === 0) {
        console.log("   No users to process, exiting");
        return;
      }
      console.log("\n\u{1F4EE} Queueing brief generation jobs...");
      let queuedCount = 0;
      let failedCount = 0;
      for (const user of users) {
        try {
          let policyInterests = [];
          if (user.interests) {
            try {
              policyInterests = typeof user.interests === "string" ? JSON.parse(user.interests) : user.interests;
            } catch (e) {
              console.log(`   \u26A0\uFE0F  Failed to parse interests for ${user.email}`);
              policyInterests = ["Politics", "Healthcare", "Education"];
            }
          } else {
            policyInterests = ["Politics", "Healthcare", "Education"];
          }
          await this.env.BRIEF_QUEUE.send({
            userId: user.id,
            userEmail: user.email || "unknown",
            userName: user.name,
            state: user.state,
            district: user.district,
            policyInterests,
            forceRegenerate: false
          }, {
            contentType: "json"
          });
          queuedCount++;
          console.log(`   \u2705 Queued brief for ${user.email || user.id}`);
        } catch (error) {
          failedCount++;
          console.error(`   \u274C Failed to queue for ${user.email || user.id}:`, error.message);
        }
      }
      const duration = Math.round((Date.now() - startTime) / 1e3);
      console.log(`
\u2705 Daily scheduling completed in ${duration}s`);
      console.log(`   Queued: ${queuedCount}`);
      console.log(`   Failed: ${failedCount}`);
      console.log(`   Total: ${users.length}`);
      console.log(`
\u{1F4EC} ${queuedCount} brief jobs queued and will be processed by brief_worker`);
    } catch (error) {
      console.error("\n\u274C Daily scheduler failed:", error);
      throw error;
    }
  }
};

// <stdin>
var stdin_default = DailyBriefScheduler;
export {
  cors,
  stdin_default as default
};
