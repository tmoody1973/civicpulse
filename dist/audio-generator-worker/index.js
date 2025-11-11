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

// src/audio-generator-worker/index.ts
import { Each } from "./runtime.js";
var audio_generator_worker_default = class extends Each {
  async process(message) {
    console.log(`\u{1F399}\uFE0F  Audio Generator: Processing job ${message.body.jobId}`);
    const { jobId } = message.body;
    try {
      console.log("   Reading script from bucket storage...");
      const scriptObj = await this.env.BRIEF_JOB_STORAGE.get(`job:${jobId}:script`);
      if (!scriptObj) {
        throw new Error("Script not found in bucket storage");
      }
      const scriptJson = await scriptObj.text();
      const script = JSON.parse(scriptJson);
      console.log(`   \u2705 Loaded script with ${script.length} dialogue turns`);
      console.log("   Generating audio with ElevenLabs (may take 5-10 min)...");
      const audioBuffer = await this.generateAudio(script);
      const audioSizeKB = Math.round(audioBuffer.byteLength / 1024);
      console.log(`   \u2705 Generated audio (${audioSizeKB}KB)`);
      const audioBase64 = Buffer.from(audioBuffer).toString("base64");
      await this.env.BRIEF_JOB_STORAGE.put(`job:${jobId}:audio`, audioBase64);
      console.log("   \u2705 Stored audio in bucket storage");
      await this.env.BRIEF_JOB_STORAGE.delete(`job:${jobId}:script`);
      await this.env.UPLOAD_QUEUE.send({ jobId }, { contentType: "json" });
      console.log("   \u2705 Sent to upload-queue");
      message.ack();
    } catch (error) {
      console.error(`\u274C Audio generator failed: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      message.retry({ delaySeconds: 300 });
    }
  }
  async generateAudio(script) {
    const inputs = script.map((line) => ({
      text: line.text,
      voice_id: line.host === "sarah" ? this.env.ELEVENLABS_SARAH_VOICE_ID : this.env.ELEVENLABS_JAMES_VOICE_ID
    }));
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_192",
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": this.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          inputs,
          model_id: "eleven_monolingual_v1"
        })
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }
    return await response.arrayBuffer();
  }
};

// <stdin>
var stdin_default = audio_generator_worker_default;
export {
  cors,
  stdin_default as default
};
