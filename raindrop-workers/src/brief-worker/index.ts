/**
 * Brief Generation Worker (Observer)
 *
 * Processes brief generation jobs from brief_queue
 * NO TIMEOUT CONSTRAINTS - can take 5-10 minutes per job
 *
 * Steps:
 * 1. Fetch personalized news articles
 * 2. Query relevant bills from database
 * 3. Generate dialogue script with Claude
 * 4. Generate audio with ElevenLabs (5-10 min)
 * 5. Upload audio to Vultr CDN
 * 6. Generate written digest
 * 7. Save complete brief to database
 */

import { Each, Message } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';
import Anthropic from '@anthropic-ai/sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface BriefJobData {
  userId: string;
  userEmail: string;
  userName?: string | null;
  state?: string | null;
  district?: string | null;
  policyInterests: string[];
  forceRegenerate: boolean;
}

export default class extends Each<BriefJobData, Env> {
  async process(message: Message<BriefJobData>): Promise<void> {
    const startTime = Date.now();
    const job = message.body;

    console.log(`\n🎯 Processing brief for ${job.userEmail}`);
      console.log(`   User ID: ${job.userId}`);
      console.log(`   Interests: ${job.policyInterests.join(', ')}`);
      console.log(`   Location: ${job.state || 'N/A'}, District: ${job.district || 'N/A'}`);

      try {
        // Step 1: Fetch personalized news articles (will import from main app)
        console.log('\n📰 Step 1: Fetching personalized news...');
        const newsArticles = await fetchNewsArticles(job.policyInterests, job.userId, this.env);
        console.log(`   ✅ Fetched ${newsArticles.length} news articles`);

        // Step 2: Query relevant bills from database
        console.log('\n📜 Step 2: Querying relevant bills...');
        const bills = await fetchPrioritizedBills(job.policyInterests, job.userId, this.env);
        console.log(`   ✅ Found ${bills.length} relevant bills`);

        // Step 3: Generate dialogue script with Claude
        console.log('\n🤖 Step 3: Generating dialogue script with Claude...');
        const dialogueScript = await generateBriefScript(newsArticles, bills, job.policyInterests, this.env);
        console.log(`   ✅ Generated script with ${dialogueScript.length} dialogue turns`);

        // Step 4: Generate audio with ElevenLabs (this is the long part - 5-10 min)
        console.log('\n🎙️  Step 4: Generating audio with ElevenLabs...');
        console.log('   ⏳ This may take 5-10 minutes...');
        const audioBuffer = await generateDialogue(dialogueScript, this.env);
        const audioSizeKB = Math.round(audioBuffer.byteLength / 1024);
        console.log(`   ✅ Generated audio (${audioSizeKB}KB)`);

        // Step 5: Upload audio to Vultr CDN
        console.log('\n☁️  Step 5: Uploading audio to Vultr CDN...');
        const audioUrl = await uploadPodcast(audioBuffer, {
          userId: job.userId,
          briefId: `brief-${Date.now()}`,
          duration: calculateDuration(audioBuffer),
          billsCovered: bills.map((b: any) => b.id),
          generatedAt: new Date(),
        }, this.env);
        console.log(`   ✅ Uploaded to: ${audioUrl}`);

        // Step 6: Generate written digest
        console.log('\n📝 Step 6: Generating written digest...');
        const writtenDigest = await generateWrittenDigest(newsArticles, bills, this.env);
        console.log(`   ✅ Generated ${writtenDigest.length} character digest`);

        // Step 7: Save complete brief to database
        console.log('\n💾 Step 7: Saving brief to database...');
        const briefId = await saveBriefToDatabase({
          userId: job.userId,
          audioUrl,
          writtenDigest,
          newsArticles,
          bills,
          generatedAt: new Date(),
        }, this.env);
        console.log(`   ✅ Saved brief ID: ${briefId}`);

        // Success! Acknowledge message
        const totalTime = Math.round((Date.now() - startTime) / 1000);
        console.log(`\n✅ Brief generation completed in ${totalTime}s`);
        console.log(`   Brief ID: ${briefId}`);
        console.log(`   Audio URL: ${audioUrl}`);
        console.log(`   Articles: ${newsArticles.length}`);
        console.log(`   Bills: ${bills.length}`);

        message.ack(); // Mark as successfully processed

      } catch (error: any) {
        console.error(`\n❌ Brief generation failed:`, error);
        console.error(`   User: ${job.userEmail}`);
        console.error(`   Error: ${error.message}`);

      // Retry with exponential backoff
      message.retry({ delaySeconds: 300 }); // Retry in 5 minutes
    }
  }
}

export interface Body extends BriefJobData {}

// ====================
// Helper Functions
// ====================
// (These will import from the main app's lib/ directory)

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

  if (!response.ok) {
    throw new Error(`Brave Search API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return data.web?.results || [];
}

async function fetchPrioritizedBills(interests: string[], userId: string, env: Env): Promise<any[]> {
  // Build LIKE conditions for each interest
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

  const result = await env.CIVIC_DB.prepare(query).all();
  return result.results || [];
}

async function generateBriefScript(
  newsArticles: any[],
  bills: any[],
  interests: string[],
  env: Env
): Promise<any[]> {
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
${bills.map((b, i) => `${i+1}. ${b.title} - ${b.summary || b.plain_english_summary || 'No summary available'}`).join('\n')}

NEWS:
${newsArticles.slice(0, 3).map((a, i) => `${i+1}. ${a.title || a.name}`).join('\n')}

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

  const key = `podcasts/${metadata.userId}/daily/${Date.now()}.mp3`;

  await s3.send(new PutObjectCommand({
    Bucket: 'civic-pulse-podcasts',
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

async function generateWrittenDigest(
  newsArticles: any[],
  bills: any[],
  env: Env
): Promise<string> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const prompt = `Create a concise written summary (200-300 words) of this daily brief:

BILLS:
${bills.map(b => `- ${b.title}: ${b.summary || b.plain_english_summary || 'No summary available'}`).join('\n')}

NEWS:
${newsArticles.slice(0, 5).map(a => `- ${a.title || a.name}`).join('\n')}

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

async function saveBriefToDatabase(data: any, env: Env): Promise<string> {
  const briefId = `brief-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const query = `
    INSERT INTO briefs (
      id, user_id, type, audio_url, transcript,
      written_digest, bills_covered, policy_areas, duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await env.CIVIC_DB.prepare(query).bind(
    briefId,
    data.userId,
    'daily',
    data.audioUrl,
    JSON.stringify(data.newsArticles),
    data.writtenDigest,
    JSON.stringify(data.bills.map((b: any) => b.id)),
    JSON.stringify(data.bills.map((b: any) => b.issue_categories)),
    calculateDuration(new ArrayBuffer(0)) // Will use actual audio buffer later
  ).run();

  return briefId;
}

function calculateDuration(audioBuffer: ArrayBuffer): number {
  // MP3 at 192kbps: ~24KB per second
  // This is an estimate - exact duration requires parsing MP3 headers
  const sizeKB = audioBuffer.byteLength / 1024;
  const estimatedSeconds = Math.round(sizeKB / 24);
  return estimatedSeconds;
}
