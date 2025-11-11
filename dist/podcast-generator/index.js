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

// src/podcast-generator/index.ts
import { Actor } from "./runtime.js";
var PodcastGenerator = class extends Actor {
  constructor(state, env) {
    super(state, env);
    this.data = {
      history: [],
      preferences: {}
    };
  }
  /**
   * Handle HTTP requests to actor
   */
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === "/submit-job" && request.method === "POST") {
        return await this.handleSubmitJob(request);
      }
      if (path === "/update-status" && request.method === "POST") {
        return await this.handleUpdateStatus(request);
      }
      if (path === "/status" && request.method === "GET") {
        return await this.handleGetStatus(request);
      }
      if (path === "/history" && request.method === "GET") {
        return await this.handleGetHistory(request);
      }
      if (path === "/preferences" && request.method === "GET") {
        return await this.handleGetPreferences(request);
      }
      if (path === "/preferences" && request.method === "PUT") {
        return await this.handleUpdatePreferences(request);
      }
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("[PodcastGenerator] Request failed:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  /**
   * Load state from storage
   */
  async loadState() {
    const stored = await this.state.storage.get("data");
    if (stored) {
      this.data = stored;
    }
  }
  /**
   * NEW: Submit job for processing (replaces queue submission)
   */
  async handleSubmitJob(request) {
    await this.loadState();
    const payload = await request.json();
    console.log(`[PodcastGenerator] Received job ${payload.jobId} for user ${payload.userId}`);
    const jobStatus = {
      jobId: payload.jobId,
      status: "queued",
      progress: 0,
      message: "Job queued for processing...",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.currentJob = jobStatus;
    await this.state.storage.put("data", this.data);
    this.processJob(payload).catch((err) => {
      console.error(`[PodcastGenerator] Background job processing error:`, err);
    });
    return new Response(
      JSON.stringify({
        success: true,
        jobId: payload.jobId,
        message: "Job submitted successfully"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  /**
   * Process podcast generation job (background execution)
   */
  async processJob(payload) {
    const { jobId, userId, type, billCount } = payload;
    const startTime = Date.now();
    try {
      console.log(`[PodcastGenerator] Starting job ${jobId}`);
      await this.updateStatus(jobId, "processing", 0, "Starting podcast generation...");
      await this.updateStatus(jobId, "processing", 20, "Fetching congressional bills...");
      const bills = await this.fetchBills(type, billCount);
      if (!bills || bills.length === 0) {
        throw new Error("No bills available");
      }
      await this.updateStatus(jobId, "processing", 40, "Generating dialogue script...");
      const dialogue = await this.generateScript(bills, type);
      if (!dialogue || dialogue.length === 0) {
        throw new Error("Failed to generate dialogue");
      }
      await this.updateStatus(jobId, "processing", 60, "Creating audio (1-2 minutes)...");
      const audioBuffer = await this.generateAudio(dialogue);
      const duration = this.calculateDuration(audioBuffer);
      await this.updateStatus(jobId, "processing", 80, "Uploading to cloud...");
      const audioUrl = await this.uploadAudio(audioBuffer, userId, type, bills, duration);
      await this.updateStatus(jobId, "processing", 90, "Saving metadata...");
      await this.savePodcastMetadata(userId, type, audioUrl, dialogue, bills, duration);
      const latency = Date.now() - startTime;
      console.log(`[PodcastGenerator] Job ${jobId} completed in ${latency}ms`);
      await this.updateStatus(jobId, "complete", 100, "Podcast ready!", {
        audioUrl,
        duration,
        billsCovered: bills.map((b) => `${b.billType}${b.billNumber}`)
      });
    } catch (error) {
      console.error(`[PodcastGenerator] Job ${jobId} failed:`, error);
      await this.updateStatus(jobId, "failed", 0, "Generation failed", {
        error: error.message
      });
    }
  }
  /**
   * Update job status (internal method)
   */
  async updateStatus(jobId, status, progress, message, data) {
    await this.loadState();
    const jobStatus = {
      jobId,
      status,
      progress,
      message,
      ...data,
      createdAt: this.data.currentJob?.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      completedAt: status === "complete" || status === "failed" ? (/* @__PURE__ */ new Date()).toISOString() : void 0
    };
    this.data.currentJob = jobStatus;
    if (status === "complete" || status === "failed") {
      this.data.history.unshift(jobStatus);
      this.data.history = this.data.history.slice(0, 10);
    }
    await this.state.storage.put("data", this.data);
  }
  /**
   * Fetch bills from Congress API
   */
  async fetchBills(type, billCount) {
    const limit = billCount || (type === "daily" ? 3 : 8);
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bills/recent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ congress: 119, limit })
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch bills: ${response.status}`);
    }
    const data = await response.json();
    return data.bills || [];
  }
  /**
   * Generate dialogue script with Claude
   */
  async generateScript(bills, type) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: type === "daily" ? 2e3 : 5e3,
        messages: [
          {
            role: "user",
            content: this.buildScriptPrompt(bills, type)
          }
        ]
      })
    });
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }
    const data = await response.json();
    const dialogueText = data.content[0].text;
    const jsonMatch = dialogueText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse dialogue JSON");
    }
    return JSON.parse(jsonMatch[0]);
  }
  /**
   * Build Claude prompt
   */
  buildScriptPrompt(bills, type) {
    const targetLength = type === "daily" ? "5-7 minutes" : "15-18 minutes";
    const wordCount = type === "daily" ? "1000-1200 words" : "2500-3000 words";
    return `Create a natural, conversational podcast dialogue between two hosts (Sarah and James) discussing these congressional bills.

Bills to cover:
${bills.map((b, i) => `${i + 1}. ${b.billType}${b.billNumber}: ${b.title}
   Sponsor: ${b.sponsorName}`).join("\n\n")}

Format: Return ONLY a JSON array:
[
  { "host": "sarah", "text": "Welcome to today's update!" },
  { "host": "james", "text": "Let's dive into the bills..." }
]

Guidelines:
- Natural speech patterns with contractions
- Plain language explanations
- Target: ${targetLength} (${wordCount})
- Make it conversational like NPR`;
  }
  /**
   * Generate audio with ElevenLabs
   */
  async generateAudio(dialogue) {
    const inputs = dialogue.map((entry) => ({
      text: entry.text,
      voice_id: entry.host === "sarah" ? process.env.ELEVENLABS_SARAH_VOICE_ID : process.env.ELEVENLABS_JAMES_VOICE_ID
    }));
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_192",
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          inputs,
          model_id: "eleven_monolingual_v1",
          settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      }
    );
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }
    const audioBuffer = await response.arrayBuffer();
    return Buffer.from(audioBuffer);
  }
  /**
   * Upload audio to Vultr CDN
   */
  async uploadAudio(audioBuffer, userId, type, bills, duration) {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/storage/upload-podcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64: audioBuffer.toString("base64"),
        userId,
        type,
        metadata: {
          duration,
          billsCovered: bills.map((b) => `${b.billType}${b.billNumber}`),
          generatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      })
    });
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    const data = await response.json();
    return data.audioUrl;
  }
  /**
   * Save podcast metadata
   */
  async savePodcastMetadata(userId, type, audioUrl, dialogue, bills, duration) {
    const transcript = dialogue.map((d) => `${d.host.toUpperCase()}: ${d.text}`).join("\n\n");
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/podcasts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        type,
        audioUrl,
        transcript,
        billsCovered: bills.map((b) => ({
          id: `${b.billType}${b.billNumber}`,
          title: b.title,
          sponsor: b.sponsorName
        })),
        duration,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      })
    });
  }
  /**
   * Calculate audio duration
   */
  calculateDuration(audioBuffer) {
    const bytesPerSecond = 24 * 1024;
    return Math.round(audioBuffer.length / bytesPerSecond);
  }
  // ===== EXISTING ENDPOINTS (Keep for compatibility) =====
  /**
   * Update job status (called externally - kept for compatibility)
   */
  async handleUpdateStatus(request) {
    await this.loadState();
    const payload = await request.json();
    const jobStatus = {
      jobId: payload.jobId,
      status: payload.status,
      progress: payload.progress,
      message: payload.message || "",
      audioUrl: payload.audioUrl,
      duration: payload.duration,
      billsCovered: payload.billsCovered,
      error: payload.error,
      createdAt: this.data.currentJob?.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      completedAt: payload.status === "complete" || payload.status === "failed" ? (/* @__PURE__ */ new Date()).toISOString() : void 0
    };
    this.data.currentJob = jobStatus;
    if (payload.status === "complete" || payload.status === "failed") {
      this.data.history.unshift(jobStatus);
      this.data.history = this.data.history.slice(0, 10);
    }
    await this.state.storage.put("data", this.data);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  /**
   * Get current job status
   */
  async handleGetStatus(_request) {
    await this.loadState();
    return new Response(
      JSON.stringify({
        currentJob: this.data.currentJob || null
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  /**
   * Get generation history
   */
  async handleGetHistory(_request) {
    await this.loadState();
    return new Response(
      JSON.stringify({
        history: this.data.history
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  /**
   * Get user preferences
   */
  async handleGetPreferences(_request) {
    await this.loadState();
    return new Response(
      JSON.stringify({
        preferences: this.data.preferences
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  /**
   * Update user preferences
   */
  async handleUpdatePreferences(request) {
    await this.loadState();
    const preferences = await request.json();
    this.data.preferences = {
      ...this.data.preferences,
      ...preferences
    };
    await this.state.storage.put("data", this.data);
    return new Response(
      JSON.stringify({
        success: true,
        preferences: this.data.preferences
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
};

// <stdin>
var stdin_default = void 0;
export {
  PodcastGenerator,
  cors,
  stdin_default as default
};
