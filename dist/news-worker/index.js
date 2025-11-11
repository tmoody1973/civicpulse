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

// src/news-worker/index.ts
import { Each } from "./runtime.js";
var news_worker_default = class extends Each {
  async process(message) {
    const startTime = Date.now();
    const job = message.body;
    console.log(`
\u{1F3AF} Processing news for ${job.userEmail}`);
    console.log(`   User ID: ${job.userId}`);
    console.log(`   Interests: ${job.interests.join(", ")}`);
    console.log(`   Limit: ${job.limit}`);
    try {
      if (!job.forceRefresh) {
        console.log("\n\u{1F50D} Step 1: Checking cache...");
        const cached = await getCachedNews(job.userId, job.interests, job.limit, this.env);
        if (cached && cached.length > 0) {
          console.log(`   \u2705 Found ${cached.length} cached articles (skipping fetch)`);
          message.ack();
          return;
        }
        console.log("   No cache found, fetching fresh news...");
      }
      console.log("\n\u{1F4F0} Step 2: Fetching news from Brave Search...");
      const freshArticles = await getPersonalizedNewsFast(
        job.interests,
        job.state,
        job.district,
        this.env
      );
      console.log(`   \u2705 Found ${freshArticles.length} articles`);
      console.log("\n\u{1F4F8} Step 3: Fetching topic images...");
      const existingImages = await getTopicImages(job.interests, this.env);
      console.log(`   \u2705 Found ${existingImages.length} existing images`);
      const missingTopics = await getMissingTopicImages(job.interests, this.env);
      console.log(`   \u{1F50D} Need ${missingTopics.length} missing images`);
      let newTopicImages = [];
      if (missingTopics.length > 0) {
        console.log("   \u{1F5BC}\uFE0F  Fetching missing images from Pexels...");
        const fetchedImages = await Promise.all(
          missingTopics.map(async (interest) => {
            try {
              const image = await getRandomPhoto(interest, this.env);
              if (image) {
                console.log(`      \u2705 Fetched image for ${interest}`);
                return {
                  topic: interest,
                  imageUrl: image.url,
                  imageAlt: image.alt || `${interest} news`,
                  photographer: image.photographer,
                  photographerUrl: image.photographerUrl
                };
              }
            } catch (error) {
              console.log(`      \u26A0\uFE0F  Failed to fetch image for ${interest}`);
            }
            return null;
          })
        );
        newTopicImages = fetchedImages.filter((img) => img !== null);
        if (newTopicImages.length > 0) {
          await saveTopicImages(newTopicImages, this.env);
          console.log(`   \u{1F4BE} Saved ${newTopicImages.length} new images`);
        }
      }
      const allTopicImages = [...existingImages, ...newTopicImages];
      console.log(`   \u2705 Total images: ${allTopicImages.length}/${job.interests.length}`);
      console.log("\n\u{1F4BE} Step 4: Saving articles to database...");
      const savedArticles = await saveNewsArticles(freshArticles, this.env);
      console.log(`   \u2705 Saved ${savedArticles.length} articles`);
      console.log("\n\u{1F4BE} Step 5: Caching results...");
      await storeArticlesInCache(job.userId, savedArticles, 24, this.env);
      const totalTime = Math.round((Date.now() - startTime) / 1e3);
      console.log(`
\u2705 News generation completed in ${totalTime}s`);
      console.log(`   Articles: ${savedArticles.length}`);
      console.log(`   Images: ${allTopicImages.length}`);
      message.ack();
    } catch (error) {
      console.error(`
\u274C News generation failed:`, error);
      console.error(`   User: ${job.userEmail}`);
      console.error(`   Error: ${error.message}`);
      message.retry({ delaySeconds: 60 });
    }
  }
};
async function getCachedNews(userId, interests, limit, env) {
  return null;
}
async function getPersonalizedNewsFast(interests, state, district, env) {
  return [];
}
async function getTopicImages(interests, env) {
  return [];
}
async function getMissingTopicImages(interests, env) {
  return [];
}
async function getRandomPhoto(topic, env) {
  return null;
}
async function saveTopicImages(images, env) {
}
async function saveNewsArticles(articles, env) {
  return [];
}
async function storeArticlesInCache(userId, articles, hours, env) {
}

// <stdin>
var stdin_default = news_worker_default;
export {
  cors,
  stdin_default as default
};
