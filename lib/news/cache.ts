/**
 * News Cache Layer
 *
 * Multi-tier caching strategy for personalized news:
 * - Tier 1: SmartMemory (Redis-backed, ~20ms)
 * - Tier 2: SmartSQL (SQLite with indexes, ~100ms)
 * - Tier 3: Perplexity API (fresh fetch, 5-15s)
 */

import type { PerplexityArticle } from '@/lib/api/perplexity';

interface CachedArticle {
  id: number;
  userId: string;
  articleUrl: string;
  title: string;
  summary: string;
  source: string;
  publishedDate: string;
  relevantTopics: string; // JSON string
  imageUrl: string;
  fetchedAt: string;
  expiresAt: string;
}

interface SmartMemoryCache {
  articles: PerplexityArticle[];
  timestamp: number;
}

/**
 * Get the Raindrop SQL client
 * IMPORTANT: Must be imported from the correct Raindrop SDK location
 */
async function getSqlClient() {
  // TODO: Import from actual Raindrop SDK
  // For now, return a mock that will be replaced with real implementation
  throw new Error('Raindrop SQL client not yet configured. See RAINDROP_SQL_URL in .env');
}

/**
 * Get the SmartMemory client
 * IMPORTANT: Must be imported from the correct Raindrop SDK location
 */
async function getSmartMemoryClient() {
  // TODO: Import from actual Raindrop SDK
  // For now, return a mock that will be replaced with real implementation
  throw new Error('SmartMemory client not yet configured. See RAINDROP_SMART_MEMORY_URL in .env');
}

/**
 * Get cached news articles for a user
 * Checks SmartMemory first (fastest), then SmartSQL (persistent)
 *
 * @param userId - User ID
 * @param interests - Array of policy interests (e.g., ['healthcare', 'climate'])
 * @param limit - Maximum number of articles to return
 * @returns Cached articles or null if cache miss
 */
export async function getCachedNews(
  userId: string,
  interests: string[],
  limit: number = 20
): Promise<PerplexityArticle[] | null> {
  // Tier 1: SmartMemory (fastest - ~20ms)
  const memoryKey = `news:${userId}:${interests.sort().join(',')}`;

  try {
    const smartMemory = await getSmartMemoryClient();
    const cached = await smartMemory.get<SmartMemoryCache>(memoryKey);

    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour TTL
      console.log('✅ SmartMemory cache hit');
      return cached.articles;
    }
  } catch (error) {
    console.warn('SmartMemory read error (continuing to SQL):', error);
  }

  // Tier 2: SmartSQL (indexed queries - ~100ms)
  try {
    const sql = await getSqlClient();
    const placeholders = interests.map(() => '?').join(',');

    const rows = await sql.query<CachedArticle>(`
      SELECT
        article_url as articleUrl,
        title,
        summary,
        source,
        published_date as publishedDate,
        relevant_topics as relevantTopics,
        image_url as imageUrl
      FROM personalized_news_cache
      WHERE user_id = ?
      AND expires_at > datetime('now')
      AND EXISTS (
        SELECT 1 FROM json_each(relevant_topics)
        WHERE json_each.value IN (${placeholders})
      )
      ORDER BY fetched_at DESC
      LIMIT ?
    `, [userId, ...interests, limit]);

    if (rows.length >= 10) {
      console.log(`✅ SmartSQL cache hit (${rows.length} articles)`);

      const articles: PerplexityArticle[] = rows.map(row => ({
        url: row.articleUrl,
        title: row.title,
        summary: row.summary,
        source: row.source,
        publishedDate: row.publishedDate,
        relevantTopics: JSON.parse(row.relevantTopics),
        imageUrl: row.imageUrl
      }));

      // Backfill SmartMemory for next request
      try {
        const smartMemory = await getSmartMemoryClient();
        await smartMemory.set(memoryKey, {
          articles,
          timestamp: Date.now()
        }, { ttl: 3600 });
      } catch (error) {
        console.warn('Failed to backfill SmartMemory:', error);
      }

      return articles;
    }

    console.log(`⚠️  SmartSQL cache partial hit (${rows.length} articles, need 10+)`);
  } catch (error) {
    console.error('SmartSQL read error:', error);
  }

  console.log('❌ Cache miss - will fetch fresh from Perplexity');
  return null;
}

/**
 * Store articles in both cache tiers
 *
 * @param userId - User ID
 * @param articles - Articles to store
 * @param ttlHours - Time to live in hours (default: 24)
 */
export async function storeArticlesInCache(
  userId: string,
  articles: PerplexityArticle[],
  ttlHours: number = 24
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlHours * 3600000);

  // Store in SmartSQL (persistent)
  try {
    const sql = await getSqlClient();

    for (const article of articles) {
      await sql.query(`
        INSERT OR REPLACE INTO personalized_news_cache (
          user_id, article_url, title, summary, source,
          published_date, relevant_topics, image_url, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        article.url,
        article.title,
        article.summary,
        article.source,
        article.publishedDate,
        JSON.stringify(article.relevantTopics),
        article.imageUrl || null,
        expiresAt.toISOString()
      ]);
    }

    console.log(`✅ Stored ${articles.length} articles in SmartSQL`);
  } catch (error) {
    console.error('Failed to store in SmartSQL:', error);
    throw error; // Re-throw to signal storage failure
  }

  // Store in SmartMemory (fast access)
  try {
    const smartMemory = await getSmartMemoryClient();
    const interests = [...new Set(articles.flatMap(a => a.relevantTopics))];
    const memoryKey = `news:${userId}:${interests.sort().join(',')}`;

    await smartMemory.set(memoryKey, {
      articles,
      timestamp: Date.now()
    }, { ttl: 3600 });

    console.log('✅ Stored articles in SmartMemory');
  } catch (error) {
    console.warn('Failed to store in SmartMemory (non-fatal):', error);
    // Don't throw - SmartMemory is optional optimization
  }
}

/**
 * Cleanup expired articles from database
 * Should be run daily via cron job
 *
 * @returns Number of articles deleted
 */
export async function cleanupExpiredArticles(): Promise<number> {
  try {
    const sql = await getSqlClient();
    const result = await sql.query<{ changes: number }>(`
      DELETE FROM personalized_news_cache
      WHERE expires_at < datetime('now')
    `);

    const deletedCount = result.changes || 0;
    console.log(`🧹 Cleaned up ${deletedCount} expired articles`);
    return deletedCount;
  } catch (error) {
    console.error('Failed to cleanup expired articles:', error);
    throw error;
  }
}

/**
 * Get cache statistics for monitoring
 *
 * @param userId - User ID (optional, for user-specific stats)
 * @returns Cache statistics
 */
export async function getCacheStats(userId?: string) {
  try {
    const sql = await getSqlClient();

    if (userId) {
      // User-specific stats
      const stats = await sql.query<{
        totalArticles: number;
        oldestArticle: string;
        newestArticle: string;
        topicCounts: string;
      }>(`
        SELECT
          COUNT(*) as totalArticles,
          MIN(fetched_at) as oldestArticle,
          MAX(fetched_at) as newestArticle,
          GROUP_CONCAT(DISTINCT relevant_topics) as topicCounts
        FROM personalized_news_cache
        WHERE user_id = ?
        AND expires_at > datetime('now')
      `, [userId]);

      return stats[0];
    } else {
      // Global stats
      const stats = await sql.query<{
        totalArticles: number;
        totalUsers: number;
        expiredArticles: number;
      }>(`
        SELECT
          COUNT(*) as totalArticles,
          COUNT(DISTINCT user_id) as totalUsers,
          SUM(CASE WHEN expires_at < datetime('now') THEN 1 ELSE 0 END) as expiredArticles
        FROM personalized_news_cache
      `);

      return stats[0];
    }
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return null;
  }
}

/**
 * Clear cache for a specific user
 * Useful for debugging or user requests
 *
 * @param userId - User ID
 */
export async function clearUserCache(userId: string): Promise<void> {
  try {
    const sql = await getSqlClient();
    await sql.query(`
      DELETE FROM personalized_news_cache
      WHERE user_id = ?
    `, [userId]);

    console.log(`🗑️  Cleared cache for user ${userId}`);

    // Also clear SmartMemory
    try {
      const smartMemory = await getSmartMemoryClient();
      // Note: We'd need to know the exact keys to clear
      // For now, we'll let them expire naturally
      console.log('⚠️  SmartMemory keys will expire naturally (1 hour TTL)');
    } catch (error) {
      console.warn('Failed to clear SmartMemory:', error);
    }
  } catch (error) {
    console.error('Failed to clear user cache:', error);
    throw error;
  }
}
