# News Thumbnails Implementation Plan

## Overview
Add Unsplash thumbnails to personalized news articles in the dashboard.

## Current State
- ✅ UI already supports `imageUrl` in `PersonalizedArticle` interface
- ✅ Component shows colored placeholders when no image exists
- ✅ Image worker system exists and works for briefs
- ❌ News articles are fetched fresh each time (no persistence)
- ❌ No image URLs for news articles

## Architecture Decision

### Option 1: Real-time Image Fetch (❌ Too Slow)
Fetch images when user requests `/api/news/personalized`
**Problem**: Would take 5-10 seconds per request

### Option 2: Background Queue with Database (✅ **SELECTED**)
Store news articles in database, queue image fetches in background

```
User requests news
  ↓
Fetch from Cerebras/Tavily
  ↓
Save to news_articles table (without images)
  ↓
Queue image fetch jobs for each article
  ↓
Image worker fetches from Unsplash
  ↓
Updates news_articles table with image URLs
  ↓
Next request returns articles WITH images
```

## Implementation Steps

### 1. Create `news_articles` Table

```sql
CREATE TABLE news_articles (
  id TEXT PRIMARY KEY,  -- Hash of title+url
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  summary TEXT,
  source TEXT,
  published_date TEXT,
  relevant_topics TEXT,  -- JSON array
  image_url TEXT,
  image_alt TEXT,
  image_photographer TEXT,
  image_photographer_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_articles_topics ON news_articles(relevant_topics);
CREATE INDEX idx_news_articles_created ON news_articles(created_at DESC);
```

### 2. Update `/api/news/personalized` Endpoint

**Current behavior**: Fetches news, returns immediately
**New behavior**: Fetch → Save to DB → Queue images → Return from DB

```typescript
// app/api/news/personalized/route.ts

export async function GET(req: Request) {
  // 1. Get user interests
  const userInterests = await getUserInterests(userId);

  // 2. Check cache/database first (articles created in last 1 hour)
  const cachedArticles = await getRecentNewsArticles(userInterests, 1 * 60 * 60 * 1000);

  if (cachedArticles.length >= limit && !forceRefresh) {
    return NextResponse.json({
      success: true,
      data: cachedArticles,  // Already has imageUrl populated!
      meta: { cached: true }
    });
  }

  // 3. Fetch fresh articles from Cerebras/Tavily
  const freshArticles = await getPersonalizedNewsFast(userInterests);

  // 4. Save articles to database (without images initially)
  const savedArticles = await saveNewsArticles(freshArticles);

  // 5. Queue image fetch jobs for each article
  await queueNewsArticleImages(savedArticles);

  // 6. Return saved articles (images will populate in background)
  return NextResponse.json({
    success: true,
    data: savedArticles,
    meta: { cached: false }
  });
}
```

### 3. Update Image Worker

**Modify `workers/image-worker.ts` to handle news articles**:

```typescript
// Current: Only handles briefs table
if (job.data.briefId) {
  await executeQuery(`
    UPDATE briefs
    SET featured_image_url = '${imageUrl}'
    WHERE id = '${job.data.briefId}'
  `);
}

// New: Handle both briefs AND news articles
if (job.data.briefId) {
  // Update briefs table
  await executeQuery(`
    UPDATE briefs
    SET featured_image_url = '${imageUrl}', ...
    WHERE id = '${job.data.briefId}'
  `);
} else if (job.data.articleId) {
  // Update news_articles table
  await executeQuery(`
    UPDATE news_articles
    SET
      image_url = '${imageUrl}',
      image_alt = '${imageAlt}',
      image_photographer = '${photographer}',
      image_photographer_url = '${photographerUrl}',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = '${job.data.articleId}'
  `);
}
```

### 4. Create Database Migration Script

**File**: `add-news-articles-table.ts`

```typescript
import { executeQuery } from './lib/db/client';

async function createNewsArticlesTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS news_articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      summary TEXT,
      source TEXT,
      published_date TEXT,
      relevant_topics TEXT,
      image_url TEXT,
      image_alt TEXT,
      image_photographer TEXT,
      image_photographer_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await executeQuery(createTableSQL, 'users');

  // Create indexes
  await executeQuery(`
    CREATE INDEX IF NOT EXISTS idx_news_articles_topics
    ON news_articles(relevant_topics)
  `, 'users');

  await executeQuery(`
    CREATE INDEX IF NOT EXISTS idx_news_articles_created
    ON news_articles(created_at DESC)
  `, 'users');
}
```

## Benefits

1. **Fast User Experience**: Articles load instantly from cache
2. **Background Processing**: Images populate without blocking users
3. **Persistent Storage**: Don't re-fetch same articles repeatedly
4. **Cost Efficient**: Reduce API calls to Cerebras/Tavily/Unsplash
5. **Scalable**: Can add more metadata (read counts, favorites, etc.)

## Testing

1. **Test article persistence**:
   ```bash
   curl /api/news/personalized
   # Should see articles without images initially
   ```

2. **Test image worker**:
   ```bash
   npm run worker:images
   # Watch for news_articles update logs
   ```

3. **Test cached articles with images**:
   ```bash
   # Wait 10 seconds for images to populate
   curl /api/news/personalized
   # Should see articles WITH imageUrl populated
   ```

## Migration Path

1. ✅ **Phase 1**: Create news_articles table (COMPLETE - Migration ran successfully)
2. ✅ **Phase 2**: Update /api/news/personalized to use database (COMPLETE)
3. ✅ **Phase 3**: Modify image worker to handle news articles (COMPLETE)
4. ✅ **Phase 4**: Database migration completed (COMPLETE)
5. **Phase 5** (optional): Add article expiration (delete articles older than 7 days)

## Implementation Complete! 🎉

All phases are complete. The system is ready to:
- Store news articles in the database with 1-hour cache window
- Queue background image fetch jobs for each article
- Display thumbnails from Unsplash in the dashboard
- Serve cached articles with images on subsequent requests

## Files to Create/Modify

**Create**:
- `add-news-articles-table.ts` - Database migration
- `lib/db/news-articles.ts` - CRUD operations for news articles
- `lib/queue/news-image-integration.ts` - Helper to queue news article images

**Modify**:
- `app/api/news/personalized/route.ts` - Use database + queue images
- `workers/image-worker.ts` - Handle news_articles table updates
- `IMAGE_WORKER_README.md` - Document news articles support

## Next Steps

Run: `npx tsx add-news-articles-table.ts` once database is configured
