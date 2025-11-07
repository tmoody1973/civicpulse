# Image Worker System

Background queue for fetching images from Unsplash for news articles and briefs.

## Architecture

The image worker system runs independently and handles images for both briefs and news articles:

```
Brief Generation Worker → Saves brief to database
    ↓
Queues image fetch job → image-fetch queue (Redis)
    ↓
Image Worker picks up job → Searches Unsplash
    ↓
Updates brief with image URLs → Database
```

```
News API (/api/news/personalized) → Saves articles to database
    ↓
Queues image fetch jobs → image-fetch queue (Redis)
    ↓
Image Worker picks up jobs → Searches Unsplash
    ↓
Updates news_articles with image URLs → Database
```

## Components

### 1. Image Queue (`lib/queue/image-queue.ts`)
- Queue name: `image-fetch`
- Job data: briefId, title, description, keywords
- Retry: 3 attempts with exponential backoff
- Cleanup: 24h for completed jobs, 7 days for failed jobs

### 2. Unsplash API Client (`lib/api/unsplash.ts`)
- `searchImages()` - Search Unsplash by query
- `findBestImage()` - Multi-strategy search (keywords → title → description)
- `downloadImage()` - Track attribution (required by Unsplash)
- Rate limit: 50 requests/hour (free tier)

### 3. Image Worker (`workers/image-worker.ts`)
- Concurrency: 5 images processed simultaneously
- Rate limiter: 50 requests per hour
- Progress tracking: 20% → 50% → 80% → 100%
- Updates **briefs table** with:
  - `featured_image_url`
  - `featured_image_alt`
  - `featured_image_photographer`
  - `featured_image_photographer_url`
- Updates **news_articles table** with:
  - `image_url`
  - `image_alt`
  - `image_photographer`
  - `image_photographer_url`

## Running the Worker

### Start the worker:
```bash
npm run worker:images
```

### In separate terminal, test with a sample job:
```bash
chmod +x test-image-worker.sh
./test-image-worker.sh
```

## Integration with Brief Generation

✅ **INTEGRATED** - The brief worker now automatically queues images after generating each brief.

The integration happens in `workers/brief-worker.ts` after the brief is saved to the database. It uses the `queueAllBriefImages()` helper function to queue both:
- Featured image for the brief
- Thumbnail images for each news article

```typescript
// From workers/brief-worker.ts (lines 193-201)
await queueAllBriefImages({
  briefId,
  briefTitle: 'Daily Civic Brief',
  briefDescription: writtenDigest.substring(0, 200),
  newsArticles,
  keywords: userPreferences.policyAreas,
});
```

This automatically creates separate image fetch jobs for the brief and each article.

## Database Schema

### Briefs Table

The briefs table needs these columns (run `npx tsx add-image-columns.ts` once database is configured):

```sql
ALTER TABLE briefs ADD COLUMN featured_image_url TEXT;
ALTER TABLE briefs ADD COLUMN featured_image_alt TEXT;
ALTER TABLE briefs ADD COLUMN featured_image_photographer TEXT;
ALTER TABLE briefs ADD COLUMN featured_image_photographer_url TEXT;
```

### News Articles Table

The news_articles table is created with image columns (run `npx tsx add-news-articles-table.ts` once database is configured):

```sql
CREATE TABLE news_articles (
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
);

CREATE INDEX idx_news_articles_topics ON news_articles(relevant_topics);
CREATE INDEX idx_news_articles_created ON news_articles(created_at DESC);
```

## Environment Variables

Required:
```bash
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

Already configured in `.env.local`:
```
UNSPLASH_ACCESS_KEY=FO_HU-vbuzSTrQJFjdVeGB23PIV1OVQajOrGpVyV58U
```

## Monitoring

### Worker Logs
```bash
npm run worker:images
```

Shows:
- Job start/completion
- Progress updates (20%, 50%, 80%, 100%)
- Image found/saved
- Error messages

### Redis CLI
```bash
redis-cli
> LLEN bull:image-fetch:waiting
> LLEN bull:image-fetch:active
> LLEN bull:image-fetch:completed
> LLEN bull:image-fetch:failed
```

## Error Handling

The worker handles:
- **No image found**: Returns success=false with reason
- **Unsplash API errors**: Retries 3 times with exponential backoff
- **Database errors**: Fails job (will retry on next attempt)

## Testing Strategy

### Manual Test (Standalone)
```bash
# 1. Start image worker only
npm run worker:images

# 2. In new terminal, submit test job
./test-image-worker.sh

# 3. Watch worker logs for:
#    - Job picked up
#    - Unsplash search
#    - Image found
#    - Database updated
```

### Integration Test (Full System)
The image worker is automatically triggered when generating briefs.

**Terminal 1 - Brief Generation Worker:**
```bash
npm run worker
```

**Terminal 2 - Image Worker:**
```bash
npm run worker:images
```

**Terminal 3 - Trigger Brief Generation:**
```bash
curl -X POST http://localhost:3000/api/briefs/generate-daily \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"force_regenerate": true}'
```

**What happens:**
1. Brief worker generates podcast (5-7 min)
2. Brief worker saves to database
3. Brief worker queues image jobs automatically
4. Image worker picks up jobs and fetches:
   - 1 featured image for the brief
   - N thumbnail images for news articles
5. Images saved to database and visible in UI

## Performance

- **Concurrency**: 5 images processed simultaneously
- **Rate limit**: 50 requests/hour (Unsplash free tier)
- **Average time**: 2-5 seconds per image
- **Queue throughput**: ~10 images/minute (within rate limits)

## Future Enhancements

- [ ] Image caching (avoid re-fetching same images)
- [ ] Fallback to other image providers (Pexels, Pixabay)
- [ ] Image optimization (resize, compress before storing URL)
- [ ] Generate alt text using Claude if not provided by Unsplash
- [ ] Support for multiple images per brief
- [ ] User-uploaded images support
