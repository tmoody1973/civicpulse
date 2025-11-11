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

// src/queue-api/index.ts
import { Service } from "./runtime.js";
var QueueAPIService = class extends Service {
  async fetch(request) {
    const env = this.env;
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        // TODO: Restrict to NEXT_PUBLIC_APP_URL in production
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      };
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      if (path === "/submit-podcast-job" && request.method === "POST") {
        try {
          const payload = await request.json();
          if (!payload.jobId || !payload.userId || !payload.type) {
            return new Response(
              JSON.stringify({ error: "Missing required fields: jobId, userId, type" }),
              { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
          console.log(`[QueueAPI] Submitting job ${payload.jobId}`);
          const actorId = env.PODCAST_GENERATOR.idFromName(payload.userId);
          const actor = env.PODCAST_GENERATOR.get(actorId);
          await actor.fetch(new Request("http://internal/submit-job", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: payload.jobId,
              userId: payload.userId,
              type: payload.type,
              billCount: payload.billCount,
              topics: payload.topics
            })
          }));
          console.log(`[QueueAPI] Job ${payload.jobId} submitted`);
          return new Response(
            JSON.stringify({ success: true, jobId: payload.jobId }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        } catch (error) {
          console.error("[QueueAPI] Submit failed:", error);
          return new Response(
            JSON.stringify({ error: `Failed to submit job: ${error.message}` }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }
      if (path.startsWith("/job-status/") && request.method === "GET") {
        const jobId = path.split("/job-status/")[1];
        const response = await this.getJobStatus(jobId, url.searchParams.get("userId") || "");
        return new Response(response.body, {
          status: response.status,
          headers: { ...response.headers, ...corsHeaders }
        });
      }
      if (path === "/test-brief" && request.method === "POST") {
        try {
          const payload = await request.json();
          console.log("[QueueAPI] Sending test brief generation request");
          await env.BRIEF_QUEUE.send({
            userId: payload.userId || "test-user-123",
            userEmail: payload.userEmail || "test@example.com",
            userName: payload.userName || "Test User",
            state: payload.state || "CA",
            district: payload.district || "12",
            policyInterests: payload.policyInterests || ["healthcare", "education"],
            forceRegenerate: false
          }, { contentType: "json" });
          console.log("[QueueAPI] Test brief request sent to brief-queue");
          return new Response(
            JSON.stringify({ success: true, message: "Test brief generation started" }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        } catch (error) {
          console.error("[QueueAPI] Test brief failed:", error);
          return new Response(
            JSON.stringify({ error: `Failed to start test: ${error.message}` }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }
      return new Response("Not Found", {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    } catch (error) {
      console.error("[QueueAPI] Request failed:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  /**
   * Submit podcast generation job to queue
   */
  async submitPodcastJob(request) {
    const env = this.env;
    try {
      const payload = await request.json();
      if (!payload.jobId || !payload.userId || !payload.type) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: jobId, userId, type" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      console.log(`[QueueAPI] Submitting podcast job ${payload.jobId} for user ${payload.userId}`);
      try {
        const actorId = env.PODCAST_GENERATOR.idFromName(payload.userId);
        const actor = env.PODCAST_GENERATOR.get(actorId);
        await actor.fetch(new Request("http://internal/submit-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: payload.jobId,
            userId: payload.userId,
            type: payload.type,
            billCount: payload.billCount,
            topics: payload.topics
          })
        }));
        console.log(`[QueueAPI] Job ${payload.jobId} submitted to Actor successfully`);
      } catch (actorError) {
        console.error("[QueueAPI] Actor communication failed:", actorError);
        throw new Error(`Actor submission failed: ${actorError.message}`);
      }
      return new Response(
        JSON.stringify({
          success: true,
          jobId: payload.jobId,
          message: "Job submitted successfully"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("[QueueAPI] Failed to submit job:", error);
      return new Response(
        JSON.stringify({ error: `Failed to submit job: ${error.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  /**
   * Get job status from podcast-generator actor
   */
  async getJobStatus(jobId, userId) {
    try {
      if (!jobId || !userId) {
        return new Response(
          JSON.stringify({ error: "Missing jobId or userId parameter" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const actorId = this.env.PODCAST_GENERATOR.idFromName(userId);
      const actor = this.env.PODCAST_GENERATOR.get(actorId);
      const response = await actor.fetch(new Request("http://internal/status", {
        method: "GET"
      }));
      const data = await response.json();
      if (data.currentJob && data.currentJob.jobId === jobId) {
        return new Response(
          JSON.stringify(data.currentJob),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Job not found or already completed" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("[QueueAPI] Failed to get job status:", error);
      return new Response(
        JSON.stringify({ error: `Failed to get job status: ${error.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};

// <stdin>
var stdin_default = QueueAPIService;
export {
  cors,
  stdin_default as default
};
