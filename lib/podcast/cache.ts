/**
 * Podcast Pre-generation Cache
 *
 * Caches pre-generated podcasts for instant delivery.
 * Podcasts are generated during off-peak hours (3am) and cached for 24 hours.
 *
 * Flow:
 * 1. Cron job generates podcasts for all active users at 3am
 * 2. Podcasts stored in Raindrop KV Cache with 24hr TTL
 * 3. User requests podcast → instant delivery from cache
 * 4. Cache miss → fallback to queue-based generation
 */

interface CachedPodcast {
  audioUrl: string;
  transcript: string;
  billsCovered: Array<{
    id: string;
    title: string;
    sponsor: string;
  }>;
  duration: number;
  generatedAt: string;
  expiresAt: string;
}

/**
 * Get cached podcast for user
 */
export async function getCachedPodcast(
  userId: string,
  type: 'daily' | 'weekly'
): Promise<CachedPodcast | null> {
  try {
    const cacheKey = `podcast:${userId}:${type}:${getTodayKey()}`;

    // TODO: Replace with actual Raindrop KV Cache
    // For now, return null (no cache)
    // In production:
    // const cached = await env.KV_CACHE.get(cacheKey);
    // return cached ? JSON.parse(cached) : null;

    console.log(`🔍 Checking cache for key: ${cacheKey}`);
    return null; // Mock: no cache hit

  } catch (error) {
    console.error('Failed to get cached podcast (non-fatal):', error);
    return null;
  }
}

/**
 * Store podcast in cache
 */
export async function cachePodcast(
  userId: string,
  type: 'daily' | 'weekly',
  podcast: CachedPodcast
): Promise<void> {
  try {
    const cacheKey = `podcast:${userId}:${type}:${getTodayKey()}`;
    const expiresAt = getEndOfDay();
    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    // TODO: Replace with actual Raindrop KV Cache
    // In production:
    // await env.KV_CACHE.put(cacheKey, JSON.stringify(podcast), {
    //   expirationTtl: ttlSeconds
    // });

    console.log(`💾 Cached podcast for key: ${cacheKey} (TTL: ${ttlSeconds}s)`);

  } catch (error) {
    console.error('Failed to cache podcast (non-fatal):', error);
  }
}

/**
 * Pre-generate podcasts for all active users
 * Called by cron job at 3am daily
 */
export async function pregeneratePodcasts(): Promise<{
  success: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  console.log('🚀 Starting podcast pre-generation...');

  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ userId: string; error: string }>
  };

  try {
    // Get all active users (users who have generated podcasts before or opted in)
    const activeUsers = await getActiveUsers();
    console.log(`📊 Found ${activeUsers.length} active users`);

    // Generate podcasts in parallel (with concurrency limit)
    const BATCH_SIZE = 5; // Process 5 users at a time to avoid rate limits

    for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
      const batch = activeUsers.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (user) => {
        try {
          console.log(`🎙️  Generating daily podcast for user: ${user.id}`);

          // Generate podcast using the same logic as manual generation
          const podcast = await generatePodcastForUser(user, 'daily');

          // Cache the result
          await cachePodcast(user.id, 'daily', podcast);

          results.success++;
          console.log(`✅ Cached podcast for user ${user.id}`);

        } catch (error: any) {
          results.failed++;
          results.errors.push({
            userId: user.id,
            error: error.message || 'Unknown error'
          });
          console.error(`❌ Failed to generate podcast for user ${user.id}:`, error);
        }
      });

      await Promise.all(batchPromises);

      // Brief pause between batches to avoid overwhelming APIs
      if (i + BATCH_SIZE < activeUsers.length) {
        await sleep(2000); // 2 second pause
      }
    }

    console.log(`✅ Pre-generation complete: ${results.success} success, ${results.failed} failed`);

  } catch (error) {
    console.error('❌ Pre-generation failed:', error);
  }

  return results;
}

/**
 * Generate podcast for a specific user
 * (Extracted from POST handler for reuse)
 */
async function generatePodcastForUser(
  user: { id: string; email: string },
  type: 'daily' | 'weekly'
): Promise<CachedPodcast> {
  // Import dependencies (avoid circular imports)
  const { fetchRecentBills, fetchBillDetails } = await import('@/lib/api/congress');
  const { generateDialogueScript } = await import('@/lib/ai/claude');
  const { generateDialogue, estimateAudioDuration } = await import('@/lib/ai/elevenlabs');
  const { uploadPodcast } = await import('@/lib/storage/vultr');

  // Fetch user profile for personalization
  const profile = await getUserProfile(user.id);

  // Step 1: Fetch bills
  const billCount = type === 'daily' ? 3 : 10;
  const bills = await fetchRecentBills({ limit: billCount });

  if (bills.length === 0) {
    throw new Error('No bills available for podcast generation');
  }

  // Fetch detailed summaries
  for (let i = 0; i < bills.length; i++) {
    try {
      const detailed = await fetchBillDetails(
        bills[i].congress,
        bills[i].billType,
        bills[i].billNumber
      );
      bills[i] = { ...bills[i], ...detailed };
    } catch (error) {
      console.warn(`Could not fetch details for bill ${i + 1}:`, error);
    }
  }

  // Step 2: Generate dialogue script
  const dialogue = await generateDialogueScript(bills, type);

  if (!dialogue || dialogue.length === 0) {
    throw new Error('Failed to generate dialogue script');
  }

  // Step 3: Generate audio
  const audioBuffer = await generateDialogue(dialogue);

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('Failed to generate audio');
  }

  const audioDuration = estimateAudioDuration(dialogue);

  // Step 4: Upload to Vultr
  const audioUrl = await uploadPodcast(audioBuffer, {
    userId: user.id,
    type,
    duration: audioDuration,
    billsCovered: bills.map((b) => `${b.billType}${b.billNumber}`),
    generatedAt: new Date(),
  });

  // Step 5: Prepare cached podcast
  const transcript = dialogue.map((d) => `${d.host.toUpperCase()}: ${d.text}`).join('\n\n');

  const cachedPodcast: CachedPodcast = {
    audioUrl,
    transcript,
    billsCovered: bills.map((b) => ({
      id: `${b.billType}${b.billNumber}`,
      title: b.title,
      sponsor: b.sponsorName,
    })),
    duration: audioDuration,
    generatedAt: new Date().toISOString(),
    expiresAt: getEndOfDay().toISOString(),
  };

  return cachedPodcast;
}

/**
 * Get all active users (users who should get pre-generated podcasts)
 */
async function getActiveUsers(): Promise<Array<{ id: string; email: string }>> {
  // TODO: Query from actual database
  // For now, return empty array (no pre-generation)
  // In production:
  // - Query users who have generated podcasts in last 30 days
  // - OR users who have opted into daily podcasts
  // - AND users with active subscriptions

  console.log('📋 Fetching active users from database...');

  // Mock implementation
  return [];
}

/**
 * Get user profile for podcast personalization
 */
async function getUserProfile(userId: string): Promise<any> {
  try {
    // TODO: Query from actual database
    // For now, return minimal profile
    return {
      representatives: [],
      interests: []
    };
  } catch (error) {
    console.warn('Failed to fetch user profile (non-fatal):', error);
    return {
      representatives: [],
      interests: []
    };
  }
}

/**
 * Get today's cache key (YYYY-MM-DD format)
 */
function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get end of day timestamp
 */
function getEndOfDay(): Date {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
