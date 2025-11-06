# Personalized News Optimization Plan

**Date:** 2025-01-05
**Status:** In Progress
**Goal:** Improve personalized news performance from 5-15s to <100ms and implement multi-topic organization UX

---

## Problem Statement

### Current Issues

1. **No Persistent Storage**
   - News fetched fresh from Perplexity API on every request
   - No database caching between server restarts
   - Expensive API calls (5-15 seconds per request)

2. **Inefficient Caching**
   - Only in-memory Map cache (1-hour TTL)
   - Resets on server restart
   - Located in `/app/api/news/perplexity/route.ts`

3. **Poor Multi-Topic UX**
   - All topics blended into single feed
   - No visual indication of topic coverage
   - Hard to see if all interests are represented
   - Example: User with `['healthcare', 'climate', 'education', 'technology']` sees random mix

4. **Reactive Fetching Only**
   - Articles fetched when users request them
   - No background pre-fetching
   - Peak traffic causes API rate limits

5. **Slow Image Enrichment**
   - Sequential: Perplexity API → Parse → OG Images → Unsplash Fallback → Placeholder
   - Each step adds latency

### Performance Metrics (Before)

| Metric | Current Performance |
|--------|---------------------|
| Initial Load | 5-15 seconds |
| Repeat Visit | 5-15 seconds (cache miss) |
| Server Restart | Total cache loss |
| Peak Traffic | API rate limits |
| Multi-Topic View | Poor (mixed feed) |

---

## Solution Architecture

### 1. Multi-Tier Caching Strategy

```
Request Flow:
┌─────────────────┐
│  User Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SmartMemory    │◄─── Tier 1: Redis-backed, ~20ms
│  (Redis Cache)  │
└────────┬────────┘
         │ Cache Miss
         ▼
┌─────────────────┐
│   SmartSQL      │◄─── Tier 2: SQLite with indexes, ~100ms
│  (SQLite DB)    │
└────────┬────────┘
         │ Cache Miss
         ▼
┌─────────────────┐
│  Perplexity API │◄─── Tier 3: Fresh fetch, 5-15s
│  + Image Fetch  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store in All   │
│  Cache Tiers    │
└─────────────────┘
```

### 2. Database Schema (SmartSQL)

```sql
-- Persistent news cache table
CREATE TABLE personalized_news_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  article_url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT,
  published_date TEXT,
  relevant_topics TEXT, -- JSON array: ["healthcare", "climate"]
  image_url TEXT,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for fast queries
CREATE INDEX idx_user_topics ON personalized_news_cache(user_id, relevant_topics);
CREATE INDEX idx_expires ON personalized_news_cache(expires_at);
CREATE INDEX idx_user_expires ON personalized_news_cache(user_id, expires_at);

-- Cleanup old articles (run daily via cron)
DELETE FROM personalized_news_cache WHERE expires_at < datetime('now');
```

**Storage Estimates:**
- Average article: ~2KB
- 20 articles per user: ~40KB
- 10,000 active users: ~400MB
- With 24-hour TTL: Manageable size

### 3. Cache Helper Functions

```typescript
// lib/news/cache.ts

import { sql } from '@/lib/db/raindrop';

interface CachedArticle {
  id: number;
  userId: string;
  articleUrl: string;
  title: string;
  summary: string;
  source: string;
  publishedDate: string;
  relevantTopics: string[];
  imageUrl: string;
  fetchedAt: Date;
  expiresAt: Date;
}

/**
 * Get cached news articles for a user
 * Checks SmartMemory first, then SmartSQL
 */
export async function getCachedNews(
  userId: string,
  interests: string[],
  limit: number = 20
): Promise<PerplexityArticle[] | null> {
  // Tier 1: SmartMemory (fastest - ~20ms)
  const memoryKey = `news:${userId}:${interests.sort().join(',')}`;

  try {
    const cached = await env.smartMemory.get(memoryKey);

    if (cached && Date.now() - cached.timestamp < 3600000) {
      console.log('✅ SmartMemory cache hit');
      return cached.articles;
    }
  } catch (error) {
    console.warn('SmartMemory read error:', error);
  }

  // Tier 2: SmartSQL (indexed queries - ~100ms)
  try {
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

      const articles = rows.map(row => ({
        ...row,
        url: row.articleUrl,
        relevantTopics: JSON.parse(row.relevantTopics as unknown as string)
      }));

      // Backfill SmartMemory for next request
      await env.smartMemory.set(memoryKey, {
        articles,
        timestamp: Date.now()
      }, { ttl: 3600 });

      return articles;
    }
  } catch (error) {
    console.error('SmartSQL read error:', error);
  }

  console.log('❌ Cache miss - will fetch fresh');
  return null;
}

/**
 * Store articles in both cache tiers
 */
export async function storeArticlesInCache(
  userId: string,
  articles: PerplexityArticle[],
  ttlHours: number = 24
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlHours * 3600000);

  // Store in SmartSQL (persistent)
  try {
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
        article.imageUrl,
        expiresAt.toISOString()
      ]);
    }

    console.log(`✅ Stored ${articles.length} articles in SmartSQL`);
  } catch (error) {
    console.error('Failed to store in SmartSQL:', error);
  }

  // Store in SmartMemory (fast access)
  try {
    const interests = [...new Set(articles.flatMap(a => a.relevantTopics))];
    const memoryKey = `news:${userId}:${interests.sort().join(',')}`;

    await env.smartMemory.set(memoryKey, {
      articles,
      timestamp: Date.now()
    }, { ttl: 3600 });

    console.log('✅ Stored articles in SmartMemory');
  } catch (error) {
    console.error('Failed to store in SmartMemory:', error);
  }
}

/**
 * Cleanup expired articles (run daily via cron)
 */
export async function cleanupExpiredArticles(): Promise<number> {
  const result = await sql.query(`
    DELETE FROM personalized_news_cache
    WHERE expires_at < datetime('now')
  `);

  console.log(`🧹 Cleaned up ${result.changes} expired articles`);
  return result.changes;
}
```

### 4. Updated API Route

```typescript
// app/api/news/personalized/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPersonalizedNews } from '@/lib/api/perplexity';
import { getCachedNews, storeArticlesInCache } from '@/lib/news/cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // 1. Get authenticated user
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Get user profile
    const profileResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/preferences/profile`,
      {
        headers: { cookie: req.headers.get('cookie') || '' },
      }
    );

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const profileData = await profileResponse.json();
    const profile = profileData.profile;

    if (!profile?.policyInterests || profile.policyInterests.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { message: 'No interests set' }
      });
    }

    // 3. Try cache first (unless forced refresh)
    if (!forceRefresh) {
      const cached = await getCachedNews(user.id, profile.policyInterests, limit);

      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached,
          meta: {
            total: cached.length,
            cached: true,
            personalized: true,
            interests: profile.policyInterests
          }
        });
      }
    }

    // 4. Fetch fresh from Perplexity
    console.log(`🔍 Fetching fresh news for: ${profile.policyInterests.join(', ')}`);

    const articles = await getPersonalizedNews(
      profile.policyInterests,
      profile.location?.state,
      profile.location?.district
    );

    // 5. Store in cache
    await storeArticlesInCache(user.id, articles);

    // 6. Return fresh articles
    return NextResponse.json({
      success: true,
      data: articles.slice(0, limit),
      meta: {
        total: articles.length,
        cached: false,
        personalized: true,
        interests: profile.policyInterests,
        state: profile.location?.state,
        district: profile.location?.district
      }
    });

  } catch (error: any) {
    console.error('Error fetching personalized news:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch personalized news',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

### 5. Multi-Topic UI Component

```typescript
// components/dashboard/personalized-news-widget.tsx

'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PersonalizedNewsCard, type PersonalizedArticle } from './personalized-news-card';
import { cn } from '@/lib/utils';

interface TopicSection {
  topic: string;
  displayName: string;
  articles: PersonalizedArticle[];
  color: string;
}

const TOPIC_DISPLAY_NAMES: Record<string, string> = {
  'healthcare': 'Healthcare',
  'education': 'Education',
  'science': 'Science',
  'technology': 'Technology',
  'climate': 'Climate',
  'economy': 'Economy',
  'business': 'Business',
  'taxes': 'Taxes',
  'immigration': 'Immigration',
  'housing': 'Housing',
  'defense': 'Defense',
  'transportation': 'Transportation',
  'agriculture': 'Agriculture',
  'social': 'Social Services',
  'civil-rights': 'Civil Rights'
};

const TOPIC_COLORS: Record<string, string> = {
  'healthcare': 'blue',
  'education': 'orange',
  'science': 'green',
  'technology': 'cyan',
  'climate': 'emerald',
  'economy': 'purple',
  'business': 'violet',
  'taxes': 'red',
  'immigration': 'yellow',
  'housing': 'lime',
  'defense': 'amber',
  'transportation': 'slate',
  'agriculture': 'green',
  'social': 'orange',
  'civil-rights': 'red'
};

interface PersonalizedNewsWidgetProps {
  limit?: number;
  showRefresh?: boolean;
}

export function PersonalizedNewsWidget({
  limit = 20,
  showRefresh = true
}: PersonalizedNewsWidgetProps) {
  const [topicSections, setTopicSections] = useState<TopicSection[]>([]);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organizeByTopics = (articles: PersonalizedArticle[]): TopicSection[] => {
    const sections = new Map<string, PersonalizedArticle[]>();

    // Group articles by topic
    articles.forEach(article => {
      article.relevantTopics?.forEach(topic => {
        if (!sections.has(topic)) {
          sections.set(topic, []);
        }
        sections.get(topic)!.push(article);
      });
    });

    // Convert to array and sort by article count (most articles first)
    return Array.from(sections.entries())
      .map(([topic, articles]) => ({
        topic,
        displayName: TOPIC_DISPLAY_NAMES[topic] || topic,
        articles,
        color: TOPIC_COLORS[topic] || 'blue'
      }))
      .sort((a, b) => b.articles.length - a.articles.length);
  };

  const fetchNews = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const url = new URL('/api/news/personalized', window.location.origin);
      url.searchParams.set('limit', String(limit));
      if (forceRefresh) {
        url.searchParams.set('refresh', 'true');
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch personalized news');
      }

      if (data.success && data.data) {
        const sections = organizeByTopics(data.data);
        setTopicSections(sections);
      }
    } catch (error) {
      console.error('Error fetching personalized news:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [limit]);

  const handleRefresh = () => {
    fetchNews(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Finding news tailored for you...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => fetchNews()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (topicSections.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No personalized news yet</p>
        <p className="text-sm">
          Update your interests in settings to get personalized news articles.
        </p>
      </div>
    );
  }

  const activeTopic = topicSections[activeTopicIndex];

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      {showRefresh && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Personalized for your interests</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      )}

      {/* Topic Pills (Horizontal Scroll) */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {topicSections.map((section, index) => (
          <button
            key={section.topic}
            onClick={() => setActiveTopicIndex(index)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              "flex items-center gap-2",
              activeTopicIndex === index
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {section.displayName}
            <Badge
              variant="outline"
              className={cn(
                "ml-1 px-1.5 py-0 text-xs",
                activeTopicIndex === index && "bg-primary-foreground/20"
              )}
            >
              {section.articles.length}
            </Badge>
          </button>
        ))}
      </div>

      {/* Active Topic Articles */}
      <div className="space-y-4">
        {activeTopic.articles.map((article, idx) => (
          <PersonalizedNewsCard
            key={idx}
            article={article}
          />
        ))}
      </div>

      {/* Coverage Indicator */}
      <div className="text-sm text-center space-y-2">
        <p className="text-muted-foreground">
          Showing <strong>{activeTopic.articles.length}</strong> articles
          in <strong>{activeTopic.displayName}</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          {topicSections.length} topics • {topicSections.reduce((sum, t) => sum + t.articles.length, 0)} total articles
        </p>
      </div>
    </div>
  );
}
```

### 6. Background Pre-fetching Cron Job

```typescript
// app/api/cron/prefetch-news/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/raindrop';
import { getPersonalizedNews } from '@/lib/api/perplexity';
import { storeArticlesInCache, cleanupExpiredArticles } from '@/lib/news/cache';

/**
 * Cron job to pre-fetch personalized news for all active users
 * Runs at 6 AM and 6 PM daily
 */
export async function GET(req: NextRequest) {
  // Verify cron secret for security
  const authHeader = req.headers.get('Authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('🔄 Starting news pre-fetch cron job');

  try {
    // 1. Cleanup expired articles first
    await cleanupExpiredArticles();

    // 2. Get all users with preferences
    const users = await sql.query<{
      userId: string;
      policyInterests: string;
      locationState?: string;
      locationDistrict?: string;
    }>(`
      SELECT
        user_id as userId,
        policy_interests as policyInterests,
        location_state as locationState,
        location_district as locationDistrict
      FROM user_profiles
      WHERE policy_interests IS NOT NULL
      AND json_array_length(policy_interests) > 0
    `);

    console.log(`📊 Found ${users.length} users with preferences`);

    // 3. Batch process (10 concurrent to respect API limits)
    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (user) => {
          try {
            const interests = JSON.parse(user.policyInterests);

            // Fetch personalized news
            const articles = await getPersonalizedNews(
              interests,
              user.locationState,
              user.locationDistrict
            );

            // Store in cache
            await storeArticlesInCache(user.userId, articles);

            console.log(`✅ Pre-fetched ${articles.length} articles for user ${user.userId}`);
            return { userId: user.userId, count: articles.length };
          } catch (error) {
            console.error(`❌ Failed to prefetch for user ${user.userId}:`, error);
            throw error;
          }
        })
      );

      // Count successes and failures
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Pre-fetch complete: ${successCount} success, ${errorCount} errors in ${duration}ms`);

    return NextResponse.json({
      success: true,
      processed: users.length,
      successful: successCount,
      failed: errorCount,
      durationMs: duration
    });

  } catch (error) {
    console.error('❌ Cron job failed:', error);
    return NextResponse.json(
      {
        error: 'Pre-fetch failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

**Netlify Configuration:**

```toml
# netlify.toml

# Scheduled function for news pre-fetching
[[functions]]
  name = "prefetch-news"
  included_files = ["lib/**/*", "app/api/cron/prefetch-news/**/*"]

[functions."prefetch-news"]
  schedule = "0 6,18 * * *"  # Run at 6 AM and 6 PM daily (UTC)
```

**Environment Variables:**

```bash
# .env.local
CRON_SECRET=your-secure-random-string-here

# Add to Netlify UI
netlify env:set CRON_SECRET "your-secure-random-string-here"
```

---

## Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Initial Load** | 5-15 seconds | ~100ms (SQL cache) | **50-150x faster** |
| **Repeat Visits** | 5-15 seconds | ~20ms (memory cache) | **250-750x faster** |
| **Server Restarts** | Cache lost | Persists in SQL | **No data loss** |
| **Peak Traffic** | API rate limits | Pre-fetched cache | **No bottleneck** |
| **Multiple Topics** | Mixed feed (poor UX) | Organized pills | **Clear coverage** |
| **User Experience** | Loading spinner | Instant display | **Seamless** |

---

## Implementation Checklist

### Phase 1: Database Schema (30 min)
- [ ] Create `personalized_news_cache` table in SmartSQL
- [ ] Add indexes for fast queries
- [ ] Test schema with sample data

### Phase 2: Cache Layer (1 hour)
- [ ] Implement `getCachedNews()` function
- [ ] Implement `storeArticlesInCache()` function
- [ ] Implement `cleanupExpiredArticles()` function
- [ ] Add SmartMemory integration
- [ ] Test cache hit/miss scenarios

### Phase 3: API Route Update (30 min)
- [ ] Update `/api/news/personalized` to use cache
- [ ] Add cache status to response metadata
- [ ] Test with real user data
- [ ] Verify performance improvements

### Phase 4: Multi-Topic UI (1 hour)
- [ ] Build topic pill navigation component
- [ ] Add topic-based article grouping
- [ ] Implement active topic switching
- [ ] Add coverage indicators
- [ ] Test with multiple user preferences

### Phase 5: Background Pre-fetching (1 hour)
- [ ] Create `/api/cron/prefetch-news` endpoint
- [ ] Add batch processing logic
- [ ] Configure Netlify scheduled function
- [ ] Set up cron secret authentication
- [ ] Test cron job execution

### Phase 6: Testing & Monitoring (30 min)
- [ ] Test with real user accounts
- [ ] Verify cache hit rates
- [ ] Monitor API usage reduction
- [ ] Check loading times
- [ ] Validate multi-topic UX

**Total Estimated Time:** 4.5 hours

---

## Monitoring & Metrics

### Key Metrics to Track

```typescript
// Log in API route
console.log({
  endpoint: '/api/news/personalized',
  userId: user.id,
  cacheHit: cached ? 'SmartMemory' : 'SmartSQL' : 'Miss',
  latency: Date.now() - startTime,
  articleCount: articles.length,
  interests: profile.policyInterests
});
```

### Success Criteria

- ✅ 95% of requests served from cache (<100ms)
- ✅ Perplexity API calls reduced by 90%
- ✅ Zero cache loss on server restarts
- ✅ All user interests visible in UI
- ✅ Background pre-fetching runs successfully 2x daily

---

## Rollback Plan

If issues arise, rollback is simple:

1. **Disable cron job** → Stop background pre-fetching
2. **Remove cache checks** → Revert to direct Perplexity calls
3. **Keep old UI** → Fallback to original widget

Original code preserved in git history.

---

## Future Enhancements

### Phase 2 (Post-Launch)
- [ ] Real-time cache invalidation on breaking news
- [ ] User-specific article rankings (ML-based)
- [ ] Push notifications for high-priority articles
- [ ] Topic preference tuning (user feedback)
- [ ] A/B test different cache TTLs

### Phase 3 (Advanced)
- [ ] Edge caching with Cloudflare Workers
- [ ] Personalized article summarization (Claude)
- [ ] Audio article summaries (ElevenLabs)
- [ ] Social sharing with OG tags

---

## References

- **Raindrop SmartSQL**: https://docs.raindrop.dev/smartsql
- **Raindrop SmartMemory**: https://docs.raindrop.dev/smartmemory
- **Netlify Scheduled Functions**: https://docs.netlify.com/functions/scheduled-functions/
- **Perplexity API**: https://docs.perplexity.ai/

---

**Status:** Ready for implementation
**Owner:** Development Team
**Review Date:** 2025-01-05
**Next Review:** Post-implementation (1 week after launch)
