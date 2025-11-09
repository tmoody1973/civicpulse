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

import type { MessageBatch, Message } from 'raindrop';

interface Env {
  HAKIVO_DB: any; // Raindrop SQL database
  // Environment variables for external APIs
  ANTHROPIC_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_SARAH_VOICE_ID: string;
  ELEVENLABS_JAMES_VOICE_ID: string;
  VULTR_STORAGE_ENDPOINT: string;
  VULTR_ACCESS_KEY: string;
  VULTR_SECRET_KEY: string;
  VULTR_CDN_URL: string;
}

interface BriefJobData {
  userId: string;
  userEmail: string;
  userName?: string | null;
  state?: string | null;
  district?: string | null;
  policyInterests: string[];
  forceRegenerate: boolean;
}

export default {
  async queue(batch: MessageBatch<BriefJobData>, env: Env): Promise<void> {
    console.log(`\n📦 Brief worker received batch of ${batch.messages.length} jobs`);

    // Process each message in the batch
    for (const message of batch.messages) {
      const startTime = Date.now();
      const job = message.body;

      console.log(`\n🎯 Processing brief for ${job.userEmail}`);
      console.log(`   User ID: ${job.userId}`);
      console.log(`   Interests: ${job.policyInterests.join(', ')}`);
      console.log(`   Location: ${job.state || 'N/A'}, District: ${job.district || 'N/A'}`);

      try {
        // Step 1: Fetch personalized news articles (will import from main app)
        console.log('\n📰 Step 1: Fetching personalized news...');
        const newsArticles = await fetchNewsArticles(job.policyInterests, job.userId, env);
        console.log(`   ✅ Fetched ${newsArticles.length} news articles`);

        // Step 2: Query relevant bills from database
        console.log('\n📜 Step 2: Querying relevant bills...');
        const bills = await fetchPrioritizedBills(job.policyInterests, job.userId, env);
        console.log(`   ✅ Found ${bills.length} relevant bills`);

        // Step 3: Generate dialogue script with Claude
        console.log('\n🤖 Step 3: Generating dialogue script with Claude...');
        const dialogueScript = await generateBriefScript(newsArticles, bills, job.policyInterests, env);
        console.log(`   ✅ Generated script with ${dialogueScript.length} dialogue turns`);

        // Step 4: Generate audio with ElevenLabs (this is the long part - 5-10 min)
        console.log('\n🎙️  Step 4: Generating audio with ElevenLabs...');
        console.log('   ⏳ This may take 5-10 minutes...');
        const audioBuffer = await generateDialogue(dialogueScript, env);
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
        }, env);
        console.log(`   ✅ Uploaded to: ${audioUrl}`);

        // Step 6: Generate written digest
        console.log('\n📝 Step 6: Generating written digest...');
        const writtenDigest = await generateWrittenDigest(newsArticles, bills, env);
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
        }, env);
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
  },
};

// ====================
// Helper Functions
// ====================
// (These will import from the main app's lib/ directory)

async function fetchNewsArticles(interests: string[], userId: string, env: Env): Promise<any[]> {
  // Import and call getPersonalizedNewsFast from main app
  // This is a placeholder - actual implementation will import from ../lib
  return [];
}

async function fetchPrioritizedBills(interests: string[], userId: string, env: Env): Promise<any[]> {
  // Query bills from database based on user interests
  // This is a placeholder - actual implementation will query HAKIVO_DB
  return [];
}

async function generateBriefScript(
  newsArticles: any[],
  bills: any[],
  interests: string[],
  env: Env
): Promise<any[]> {
  // Generate dialogue script using Claude API
  // This is a placeholder - actual implementation will call Claude
  return [];
}

async function generateDialogue(dialogueScript: any[], env: Env): Promise<ArrayBuffer> {
  // Generate audio using ElevenLabs text-to-dialogue API
  // This is a placeholder - actual implementation will call ElevenLabs
  return new ArrayBuffer(0);
}

async function uploadPodcast(
  audioBuffer: ArrayBuffer,
  metadata: any,
  env: Env
): Promise<string> {
  // Upload to Vultr Object Storage
  // This is a placeholder - actual implementation will use Vultr SDK
  return 'https://cdn.example.com/audio.mp3';
}

async function generateWrittenDigest(
  newsArticles: any[],
  bills: any[],
  env: Env
): Promise<string> {
  // Generate written summary using Claude
  // This is a placeholder - actual implementation will call Claude
  return 'Daily brief digest...';
}

async function saveBriefToDatabase(data: any, env: Env): Promise<string> {
  // Save brief to database
  // This is a placeholder - actual implementation will use HAKIVO_DB
  return 'brief-123';
}

function calculateDuration(audioBuffer: ArrayBuffer): number {
  // Calculate audio duration in seconds
  // This is a placeholder - actual calculation based on audio format
  return 300; // 5 minutes
}
