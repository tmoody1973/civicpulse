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

// src/podcast-queue-handler/index.ts
import { Each } from "./runtime.js";
var PodcastQueueHandler = class extends Each {
  async process(message) {
    const { jobId, userId, type, billCount, topics } = message.body;
    const startTime = Date.now();
    console.log(`[PodcastQueue] Processing job ${jobId} (user: ${userId}, type: ${type})`);
    try {
      await this.updateActorStatus(userId, jobId, "processing", 0);
      await this.updateActorStatus(userId, jobId, "processing", 20, "Fetching congressional bills...");
      const bills = await this.fetchBills(type, billCount);
      if (!bills || bills.length === 0) {
        throw new Error("No bills available for podcast generation");
      }
      console.log(`[PodcastQueue] Fetched ${bills.length} bills for job ${jobId}`);
      await this.updateActorStatus(userId, jobId, "processing", 40, "Generating dialogue script with AI...");
      const dialogue = await this.generateScript(bills, type);
      if (!dialogue || dialogue.length === 0) {
        throw new Error("Failed to generate dialogue script");
      }
      console.log(`[PodcastQueue] Generated ${dialogue.length} dialogue exchanges for job ${jobId}`);
      await this.updateActorStatus(userId, jobId, "processing", 60, "Creating audio (this takes 1-2 minutes)...");
      const audioBuffer = await this.generateAudio(dialogue);
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error("Failed to generate audio");
      }
      const duration = this.calculateDuration(audioBuffer);
      console.log(`[PodcastQueue] Generated ${audioBuffer.length} bytes audio (${duration}s) for job ${jobId}`);
      await this.updateActorStatus(userId, jobId, "processing", 80, "Uploading to cloud storage...");
      const audioUrl = await this.uploadAudio(audioBuffer, userId, type, bills, duration);
      console.log(`[PodcastQueue] Uploaded audio to ${audioUrl} for job ${jobId}`);
      await this.updateActorStatus(userId, jobId, "processing", 90, "Saving podcast metadata...");
      await this.savePodcastMetadata(userId, type, audioUrl, dialogue, bills, duration);
      const latency = Date.now() - startTime;
      console.log(`[PodcastQueue] Job ${jobId} completed in ${latency}ms`);
      await this.updateActorStatus(userId, jobId, "complete", 100, "Podcast ready!", {
        audioUrl,
        duration,
        billsCovered: bills.map((b) => `${b.billType}${b.billNumber}`)
      });
      await this.queueNotification(userId, {
        type: "podcast_ready",
        title: "Your podcast is ready!",
        message: `Your ${type} podcast is ready to listen.`,
        audioUrl
      });
    } catch (error) {
      console.error(`[PodcastQueue] Job ${jobId} failed:`, error);
      await this.updateActorStatus(userId, jobId, "failed", 0, "Podcast generation failed", {
        error: error.message
      });
      throw error;
    }
  }
  /**
   * Update podcast-generator actor status
   */
  async updateActorStatus(userId, jobId, status, progress, message, data) {
    try {
      const actorId = this.env.PODCAST_GENERATOR.idFromName(userId);
      const actor = this.env.PODCAST_GENERATOR.get(actorId);
      await actor.fetch(new Request("http://internal/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          status,
          progress,
          message,
          ...data
        })
      }));
    } catch (error) {
      console.error(`[PodcastQueue] Failed to update actor status:`, error);
    }
  }
  /**
   * Fetch bills from Congress API
   */
  async fetchBills(type, billCount) {
    const limit = billCount || (type === "daily" ? 3 : 8);
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bills/recent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        congress: 119,
        limit
      })
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
      throw new Error("Failed to parse dialogue JSON from Claude response");
    }
    return JSON.parse(jsonMatch[0]);
  }
  /**
   * Build Claude prompt for dialogue script
   */
  buildScriptPrompt(bills, type) {
    const targetLength = type === "daily" ? "5-7 minutes" : "15-18 minutes";
    const wordCount = type === "daily" ? "1000-1200 words" : "2500-3000 words";
    return `Create a natural, conversational podcast dialogue between two hosts (Sarah and James) discussing these congressional bills. Make it engaging, informative, and accessible to everyday citizens.

Bills to cover:
${bills.map((b, i) => `${i + 1}. ${b.billType}${b.billNumber}: ${b.title}
   Sponsor: ${b.sponsorName}
   Summary: ${b.title}`).join("\n\n")}

Format: Return ONLY a JSON array with no markdown formatting:
[
  { "host": "sarah", "text": "Welcome to today's congressional update!" },
  { "host": "james", "text": "Let's dive into the bills that matter most..." }
]

Guidelines:
- Sarah introduces topics, James adds context and analysis
- Use contractions and natural speech patterns
- Include acknowledgments ("That's right", "Exactly", "Interesting point")
- Explain bills in plain language - no jargon
- Target length: ${targetLength} (approximately ${wordCount})
- Make it conversational and engaging, like NPR hosts`;
  }
  /**
   * Generate audio with ElevenLabs text-to-dialogue
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
          settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
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
   * Save podcast metadata to SmartSQL database
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
   * Queue notification for user
   */
  async queueNotification(userId, notification) {
    await this.env.USER_NOTIFICATIONS.send({
      userId,
      ...notification,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  /**
   * Calculate audio duration from buffer size
   * MP3 at 192kbps, 44.1kHz = approximately 24KB per second
   */
  calculateDuration(audioBuffer) {
    const bytesPerSecond = 24 * 1024;
    return Math.round(audioBuffer.length / bytesPerSecond);
  }
};

// <stdin>
var stdin_default = PodcastQueueHandler;
export {
  cors,
  stdin_default as default
};
