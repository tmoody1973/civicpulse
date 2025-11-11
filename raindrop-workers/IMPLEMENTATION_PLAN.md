# Raindrop Workers - Real API Implementation Plan

**Status:** Ready to implement
**Estimated Time:** 2-3 hours of development + testing
**Risk Level:** Medium (external API dependencies)

---

## Overview

Replace placeholder functions in `brief-worker` and `news-worker` with real API implementations.

### Key Dependencies
- ✅ All 10 environment secrets configured
- ✅ Workers deployed and running
- ✅ Test infrastructure in place
- ⏳ Need to add npm packages: `@anthropic-ai/sdk`, `@aws-sdk/client-s3`

---

## Phase 1: Brief Worker Implementation

### Files to Modify
- `src/brief-worker/index.ts` - Replace 8 placeholder functions

### Functions to Implement

#### 1. `fetchNewsArticles()`
**API:** Brave Search API
**Endpoint:** `https://api.search.brave.com/res/v1/web/search`
**Environment Variable:** `BRAVE_SEARCH_API_KEY`

```typescript
async function fetchNewsArticles(interests: string[], userId: string, env: Env): Promise<any[]> {
  const query = interests.join(' OR ') + ' news legislation';

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&freshness=pw`,
    {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY
      }
    }
  );

  const data = await response.json();
  return data.web?.results || [];
}
```

#### 2. `fetchPrioritizedBills()`
**Database:** Raindrop SQL (hakivo-db)
**Query:** Bills matching user interests

```typescript
async function fetchPrioritizedBills(interests: string[], userId: string, env: Env): Promise<any[]> {
  const interestConditions = interests.map(interest =>
    `issue_categories LIKE '%${interest}%'`
  ).join(' OR ');

  const query = `
    SELECT * FROM bills
    WHERE (${interestConditions})
    AND latest_action_date >= datetime('now', '-30 days')
    ORDER BY impact_score DESC
    LIMIT 3
  `;

  const result = await env.HAKIVO_DB.execute(query);
  return result.rows || [];
}
```

#### 3. `generateBriefScript()`
**API:** Claude Sonnet 4 (Anthropic)
**Model:** `claude-sonnet-4-20250514`
**Environment Variable:** `ANTHROPIC_API_KEY`

```typescript
import Anthropic from '@anthropic-ai/sdk';

async function generateBriefScript(
  newsArticles: any[],
  bills: any[],
  interests: string[],
  env: Env
): Promise<Array<{host: 'sarah' | 'james', text: string}>> {

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are a podcast script writer for HakiVo.
Create natural dialogue between Sarah and James covering these bills and news.

Guidelines:
- NPR-quality conversational tone
- Plain language, no jargon
- 25-35 dialogue lines (8-12 minutes of audio)
- Alternate speakers naturally
- Include intro, bill discussion, outro

Return JSON array:
[
  {"host": "sarah", "text": "..."},
  {"host": "james", "text": "..."}
]`;

  const userPrompt = `Create dialogue covering:

BILLS:
${bills.map((b, i) => `${i+1}. ${b.title} - ${b.summary}`).join('\n')}

NEWS:
${newsArticles.slice(0, 3).map((a, i) => `${i+1}. ${a.title}`).join('\n')}

Generate the complete dialogue as JSON array.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
    ]
  });

  const responseText = message.content[0].type === 'text'
    ? message.content[0].text
    : '';

  // Extract JSON from response
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}
```

#### 4. `generateDialogue()`
**API:** ElevenLabs Text-to-Dialogue
**Endpoint:** `https://api.elevenlabs.io/v1/text-to-dialogue`
**Environment Variables:** `ELEVENLABS_API_KEY`, `ELEVENLABS_SARAH_VOICE_ID`, `ELEVENLABS_JAMES_VOICE_ID`

```typescript
async function generateDialogue(dialogueScript: any[], env: Env): Promise<ArrayBuffer> {
  const inputs = dialogueScript.map((line: any) => ({
    text: line.text,
    voice_id: line.host === 'sarah'
      ? env.ELEVENLABS_SARAH_VOICE_ID
      : env.ELEVENLABS_JAMES_VOICE_ID
  }));

  const response = await fetch(
    'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_192',
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        inputs,
        model_id: 'eleven_monolingual_v1'
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return await response.arrayBuffer();
}
```

#### 5. `uploadPodcast()`
**Service:** Vultr Object Storage (S3-compatible)
**Environment Variables:** `VULTR_STORAGE_ENDPOINT`, `VULTR_ACCESS_KEY`, `VULTR_SECRET_KEY`, `VULTR_CDN_URL`

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

async function uploadPodcast(
  audioBuffer: ArrayBuffer,
  metadata: any,
  env: Env
): Promise<string> {

  const s3 = new S3Client({
    endpoint: env.VULTR_STORAGE_ENDPOINT,
    region: 'auto',
    credentials: {
      accessKeyId: env.VULTR_ACCESS_KEY,
      secretAccessKey: env.VULTR_SECRET_KEY
    }
  });

  const key = `briefs/${metadata.userId}/${metadata.briefId}.mp3`;

  await s3.send(new PutObjectCommand({
    Bucket: 'hakivo-podcasts',
    Key: key,
    Body: Buffer.from(audioBuffer),
    ContentType: 'audio/mpeg',
    CacheControl: 'public, max-age=31536000',
    Metadata: {
      userId: metadata.userId,
      briefId: metadata.briefId,
      duration: metadata.duration.toString(),
      generatedAt: metadata.generatedAt.toISOString()
    }
  }));

  return `${env.VULTR_CDN_URL}/${key}`;
}
```

#### 6. `generateWrittenDigest()`
**API:** Claude Sonnet 4 (same as #3)

```typescript
async function generateWrittenDigest(
  newsArticles: any[],
  bills: any[],
  env: Env
): Promise<string> {

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const prompt = `Create a concise written summary (200-300 words) of this daily brief:

BILLS:
${bills.map(b => `- ${b.title}: ${b.summary}`).join('\n')}

NEWS:
${newsArticles.slice(0, 5).map(a => `- ${a.title}`).join('\n')}

Write in plain language for general audience.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  return message.content[0].type === 'text'
    ? message.content[0].text
    : '';
}
```

#### 7. `saveBriefToDatabase()`
**Database:** Raindrop SQL (hakivo-db)

```typescript
async function saveBriefToDatabase(data: any, env: Env): Promise<string> {
  const briefId = `brief-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const query = `
    INSERT INTO podcasts (
      user_id, type, audio_url, transcript,
      bills_covered, generated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  await env.HAKIVO_DB.execute(query, [
    data.userId,
    'daily',
    data.audioUrl,
    data.writtenDigest,
    JSON.stringify(data.bills.map((b: any) => b.id)),
    data.generatedAt.toISOString()
  ]);

  return briefId;
}
```

#### 8. `calculateDuration()`
**Logic:** Estimate based on audio file size

```typescript
function calculateDuration(audioBuffer: ArrayBuffer): number {
  // MP3 at 192kbps: ~24KB per second
  // This is an estimate - exact duration requires parsing MP3 headers
  const sizeKB = audioBuffer.byteLength / 1024;
  const estimatedSeconds = Math.round(sizeKB / 24);
  return estimatedSeconds;
}
```

---

## Phase 2: News Worker Implementation

### Files to Modify
- `src/news-worker/index.ts` - Replace 4 placeholder functions

### Functions to Implement

#### 1. `fetchNewsFromBrave()`
Same as brief-worker `fetchNewsArticles()` but with different query format.

#### 2. `getTopicImages()`
**API:** Pexels API
**Environment Variable:** `PEXELS_API_KEY`

```typescript
async function getTopicImages(topics: string[], env: Env): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();

  for (const topic of topics) {
    try {
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(topic)}&per_page=1`,
        {
          headers: {
            'Authorization': env.PEXELS_API_KEY
          }
        }
      );

      const data = await response.json();
      if (data.photos && data.photos.length > 0) {
        imageMap.set(topic, data.photos[0].src.medium);
      }
    } catch (error) {
      console.error(`Failed to fetch image for ${topic}:`, error);
    }
  }

  return imageMap;
}
```

#### 3. `saveNewsToCache()`
**Database:** Raindrop SQL (hakivo-db)

```typescript
async function saveNewsToCache(data: any, env: Env): Promise<void> {
  const query = `
    INSERT OR REPLACE INTO news_cache (
      user_id, articles, topic_images, cached_at
    ) VALUES (?, ?, ?, ?)
  `;

  await env.HAKIVO_DB.execute(query, [
    data.userId,
    JSON.stringify(data.articles),
    JSON.stringify(Object.fromEntries(data.topicImages)),
    data.cachedAt
  ]);
}
```

---

## Phase 3: Dependencies

### Add Required npm Packages

```bash
cd raindrop-workers
npm install @anthropic-ai/sdk @aws-sdk/client-s3
```

### Verify package.json includes:
```json
{
  "dependencies": {
    "@liquidmetal-ai/raindrop-framework": "latest",
    "@anthropic-ai/sdk": "^0.32.0",
    "@aws-sdk/client-s3": "^3.700.0"
  }
}
```

---

## Phase 4: Testing Strategy

### Unit Testing (Local)
```bash
# Test each API function independently
npx tsx test-api-clients.ts
```

### Integration Testing (Deployed)
```bash
# Send test message
curl "https://svc-01k9mbhwedn2hz25p4c9bdta1a.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/test-brief"

# Monitor logs
raindrop logs tail --application hakivo-workers
```

### Expected Behavior
1. Message sent to brief-queue ✅
2. Worker picks up message ✅
3. Fetches news (5-10 seconds)
4. Queries bills from database (1-2 seconds)
5. Generates script with Claude (10-20 seconds)
6. **Generates audio with ElevenLabs (5-10 MINUTES)** ⏳
7. Uploads to Vultr (5-10 seconds)
8. Saves to database (1-2 seconds)
9. Acknowledges message ✅

**Total Time:** 6-12 minutes per brief

---

## Phase 5: Error Handling

### Retry Strategy
- Network errors: Retry immediately
- API errors (429 rate limit): Retry after 60s
- API errors (500 server error): Retry after 300s
- Fatal errors (400 bad request): Log and skip

### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly resetTime = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.threshold) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      return timeSinceLastFailure < this.resetTime;
    }
    return false;
  }

  private onSuccess() {
    this.failures = 0;
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}
```

---

## Phase 6: Monitoring

### Key Metrics
- **Brief generation time** (target: <12 minutes)
- **Success rate** (target: >95%)
- **API error rate** (target: <5%)
- **Queue depth** (target: <10 messages)

### Logging
```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  userId: job.userId,
  step: 'audio_generation',
  duration: elapsedMs,
  status: 'success',
  audioSize: audioBuffer.byteLength
}));
```

---

## Phase 7: Deployment Checklist

- [ ] Install npm dependencies
- [ ] Update brief-worker with real implementations
- [ ] Update news-worker with real implementations
- [ ] Test locally with test-worker-logic.ts
- [ ] Deploy: `raindrop build deploy --no-watch`
- [ ] Send test message via service URL
- [ ] Monitor logs for 15 minutes
- [ ] Verify brief saved to database
- [ ] Verify audio uploaded to Vultr
- [ ] Check audio file plays correctly
- [ ] Verify scheduler triggers at midnight UTC

---

## Risk Mitigation

### High-Risk Areas
1. **ElevenLabs timeout:** Monitor closely, add health check
2. **Vultr upload failures:** Implement retry with backoff
3. **Database connection:** Use connection pooling
4. **API rate limits:** Implement exponential backoff

### Rollback Plan
If production deployment fails:
```bash
# Stop the application
raindrop build stop --application hakivo-workers

# Redeploy previous version (placeholders)
git checkout HEAD~1 raindrop-workers/src/
raindrop build deploy --no-watch

# Restart
raindrop build start --application hakivo-workers
```

---

## Success Criteria

✅ **Phase 1 Complete When:**
- Brief worker processes test message successfully
- Audio file generated and uploaded to Vultr
- Brief saved to database
- No errors in logs

✅ **Phase 2 Complete When:**
- News worker processes test message successfully
- Topic images fetched from Pexels
- News cached to database
- No errors in logs

✅ **Production Ready When:**
- All tests pass
- Error rate <5% over 24 hours
- Average processing time <12 minutes
- Scheduler runs successfully at midnight UTC

---

**Ready to proceed with implementation?**
