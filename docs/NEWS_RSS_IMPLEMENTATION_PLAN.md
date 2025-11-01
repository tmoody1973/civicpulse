# News/RSS Integration Implementation Plan

**Created:** October 28, 2025
**Purpose:** Comprehensive technical plan for integrating The Hill + Politico RSS feeds into Civic Pulse podcast generation using Raindrop Platform patterns

---

## 1. Executive Summary

### User Requirements (Plain English)

**Goal**: Enhance podcasts with contextual breaking news (Marketplace-style) using The Hill and Politico RSS feeds

**Key Features**:
1. **Context-aware news**: Bill-specific and representative-specific news on relevant pages
2. **Personalized news feeds**: Relevance scoring based on tracked bills, user interests, and geography
3. **News organization**: "Today's Must-Read", "Bill Updates", "Your Reps in the News", topic sections
4. **Marketplace-style podcasts**: Blend breaking news with bill tracking (like NPR Marketplace)
5. **News-to-bill matching**: Semantic matching of articles to relevant legislation
6. **User experience**: Scannable feeds, visual hierarchy, action-oriented (from article to bill tracking)

### Raindrop Platform Mapping

| Requirement | Raindrop Component | Purpose |
|-------------|-------------------|---------|
| RSS feed fetching & caching | **KV Cache** + **Task** | Cache parsed feeds, scheduled polling |
| News article storage & search | **SmartBuckets** + **SQL** | Semantic search + structured queries |
| News-to-bill matching | **SmartBuckets** `chunkSearch()` | RAG-powered semantic matching |
| Background processing | **Queue** + **Observer** | Async article parsing & indexing |
| Podcast enhancement | **Queue** + **SmartBuckets** | Context retrieval for dialogue |
| Scheduled polling | **Task** (cron) | Hourly RSS feed updates |

---

## 2. Architecture Overview

### 2.1 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  RSS FEED SOURCES                           │
│  ┌──────────────┐              ┌──────────────┐           │
│  │  The Hill    │              │   Politico   │           │
│  │  RSS Feeds   │              │  RSS Feeds   │           │
│  └──────┬───────┘              └───────┬──────┘           │
└─────────┼──────────────────────────────┼──────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│               RAINDROP TASK (Cron: */1 * * * *)             │
│  ┌───────────────────────────────────────────────────┐     │
│  │  RSS Parser Service                                │     │
│  │  - Fetch feeds from KV Cache (1hr TTL)            │     │
│  │  - Parse new articles                              │     │
│  │  - Send to processing queue                        │     │
│  └────────────────────┬──────────────────────────────┘     │
└────────────────────────┼──────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    RAINDROP QUEUE                           │
│         "news-processing-queue"                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              RAINDROP OBSERVER (Queue)                      │
│  ┌───────────────────────────────────────────────────┐     │
│  │  News Article Processor                            │     │
│  │  1. Extract metadata (title, desc, date, source)  │     │
│  │  2. Categorize by topic (AI-powered)              │     │
│  │  3. Store in SQL database                         │     │
│  │  4. Upload full text to SmartBucket               │     │
│  │  5. Generate semantic matches to bills            │     │
│  └────────────────────┬─────────────────────────────┘     │
└────────────────────────┼─────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
┌──────────────────┐          ┌─────────────────────┐
│  RAINDROP SQL    │          │ RAINDROP SMARTBUCKET│
│  "civic-db"      │          │  "news-articles"    │
│                  │          │                     │
│  news_articles   │          │  Full article text  │
│  news_to_bills   │          │  Semantic search    │
│  (structured)    │          │  (RAG-powered)      │
└────────┬─────────┘          └──────────┬──────────┘
         │                               │
         └───────────────┬───────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 RAINDROP SERVICE API                        │
│  /api/news/feed             - Personalized feed            │
│  /api/news/for-bill/:id     - Bill-specific news           │
│  /api/news/for-rep/:id      - Rep-specific news            │
│  /api/news/search           - Semantic search              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   USER INTERFACES                           │
│  - Dashboard news feed                                      │
│  - Bill detail page (related news)                          │
│  - Representative profile (rep-specific news)               │
│  - Enhanced podcast generation (news context)               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Raindrop Component Breakdown

#### A. **KV Cache** (`news-feed-cache`)
**Purpose**: Cache parsed RSS feeds to avoid repeated fetching

```typescript
// Cache structure
key: `rss:thehill:senate:${timestamp}`
value: {
  feedUrl: string;
  articles: Article[];
  fetchedAt: string;
  expiresAt: string;
}
ttl: 3600 // 1 hour
```

#### B. **Task** (`rss-poller`)
**Purpose**: Scheduled RSS feed polling (cron job)

```hcl
task "rss-poller" {
  schedule = "*/1 * * * *"  # Every hour
}
```

#### C. **Queue** (`news-processing-queue`)
**Purpose**: Async article parsing and processing

```typescript
// Message payload
{
  articleUrl: string;
  source: "thehill" | "politico";
  rawContent: string;
  metadata: {
    title: string;
    description: string;
    pubDate: string;
  }
}
```

#### D. **Observer** (`news-processor`)
**Purpose**: Process articles from queue

```typescript
export default class extends Each<NewsArticleMessage, Env> {
  async process(message: Message<NewsArticleMessage>): Promise<void> {
    // 1. Extract article metadata
    // 2. Categorize with AI
    // 3. Store in SQL
    // 4. Upload to SmartBucket
    // 5. Match to bills
    message.ack();
  }
}
```

#### E. **SQL Database** (`civic-db`)
**Purpose**: Structured storage for news metadata

```sql
CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL, -- 'thehill' or 'politico'
  title TEXT NOT NULL,
  description TEXT,
  url TEXT UNIQUE NOT NULL,
  published_at TIMESTAMP NOT NULL,
  category TEXT, -- 'senate', 'house', 'healthcare', etc.
  ai_topic_tags TEXT, -- JSON array of AI-generated tags
  smartbucket_id TEXT, -- Reference to SmartBucket document
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_to_bills (
  id TEXT PRIMARY KEY,
  news_article_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  relevance_score REAL NOT NULL, -- 0.0 to 1.0
  matched_keywords TEXT, -- JSON array
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (news_article_id) REFERENCES news_articles(id),
  FOREIGN KEY (bill_id) REFERENCES bills(id)
);

CREATE INDEX idx_news_published ON news_articles(published_at DESC);
CREATE INDEX idx_news_category ON news_articles(category);
CREATE INDEX idx_news_to_bills_bill ON news_to_bills(bill_id, relevance_score DESC);
CREATE INDEX idx_news_to_bills_news ON news_to_bills(news_article_id);
```

#### F. **SmartBuckets** (`news-articles`)
**Purpose**: RAG-powered semantic search for news articles

```typescript
// Upload to SmartBucket
await env.NEWS_ARTICLES.put(articleId, articleFullText, {
  metadata: {
    source: 'thehill',
    category: 'healthcare',
    publishedAt: '2025-10-28',
    billIds: ['hr-1234', 's-567'] // Related bills
  }
});

// Semantic search for bill-related news
const results = await env.NEWS_ARTICLES.search({
  input: billSummary, // Use bill summary as search query
  requestId: `bill-${billId}-news`
});
```

---

## 3. Implementation Details

### 3.1 RSS Feed Sources

#### The Hill RSS Feeds (Existing)
- Senate: `https://thehill.com/rss/feed/senate`
- House: `https://thehill.com/rss/feed/house-of-representatives`
- Healthcare: `https://thehill.com/rss/feed/healthcare`
- Defense: `https://thehill.com/rss/feed/defense`
- Energy & Environment: `https://thehill.com/rss/feed/energy-environment`
- Finance: `https://thehill.com/rss/feed/finance`
- Technology: `https://thehill.com/rss/feed/technology`

#### Politico RSS Feeds (New)
- Congress: `https://www.politico.com/rss/congress.xml`
- Healthcare: `https://www.politico.com/rss/healthcare.xml`
- Defense: `https://www.politico.com/rss/defense.xml`
- Energy: `https://www.politico.com/rss/energy.xml`
- Technology: `https://www.politico.com/rss/technology.xml`

### 3.2 News-to-Bill Matching Algorithm

**Approach**: Hybrid semantic + keyword matching

```typescript
// lib/news/bill-matcher.ts
import { Env } from '@/raindrop.gen';

interface BillMatch {
  billId: string;
  relevanceScore: number;
  matchedKeywords: string[];
  semanticScore: number;
}

export async function matchNewsToBills(
  articleText: string,
  articleMetadata: {
    title: string;
    description: string;
    category: string;
  },
  env: Env
): Promise<BillMatch[]> {
  // Step 1: Get candidate bills by category
  const candidateBills = await env.CIVIC_DB.prepare(`
    SELECT id, title, summary, issue_categories
    FROM bills
    WHERE issue_categories LIKE ?
    LIMIT 50
  `).bind(`%${articleMetadata.category}%`).all();

  // Step 2: Semantic search using SmartBuckets
  const semanticMatches = await env.NEWS_ARTICLES.chunkSearch({
    input: articleText,
    requestId: `news-match-${Date.now()}`
  });

  // Step 3: Keyword extraction from article
  const articleKeywords = await extractKeywords(
    articleText,
    articleMetadata,
    env
  );

  // Step 4: Score each bill
  const matches: BillMatch[] = [];
  for (const bill of candidateBills.results) {
    const billKeywords = extractBillKeywords(bill);
    const keywordOverlap = calculateOverlap(articleKeywords, billKeywords);
    const semanticScore = getSemanticScore(bill.id, semanticMatches.results);

    const relevanceScore = (keywordOverlap * 0.4) + (semanticScore * 0.6);

    if (relevanceScore > 0.3) { // Threshold
      matches.push({
        billId: bill.id,
        relevanceScore,
        matchedKeywords: keywordOverlap.keywords,
        semanticScore
      });
    }
  }

  // Step 5: Return top matches
  return matches.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
}

async function extractKeywords(
  text: string,
  metadata: any,
  env: Env
): Promise<string[]> {
  // Use Claude AI for keyword extraction
  const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: [{
      role: 'user',
      content: `Extract 5-10 key policy-related keywords from this article:
Title: ${metadata.title}
Description: ${metadata.description}
Text: ${text.substring(0, 1000)}

Return only keywords as JSON array.`
    }]
  });

  return JSON.parse(response.result);
}
```

### 3.3 Personalized News Feed Scoring

**Factors**:
1. **Tracked Bills** (40%): News about bills user is tracking
2. **User Interests** (30%): News matching selected issue categories
3. **Geography** (20%): News about user's representatives
4. **Recency** (10%): Newer articles score higher

```typescript
// lib/news/personalized-feed.ts
export async function getPersonalizedNewsFeed(
  userId: string,
  env: Env,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<PersonalizedNewsArticle[]> {
  // Get user preferences
  const user = await env.CIVIC_DB.prepare(
    `SELECT interests, state, district FROM users WHERE id = ?`
  ).bind(userId).first<User>();

  const trackedBills = await env.CIVIC_DB.prepare(
    `SELECT bill_id FROM tracked_bills WHERE user_id = ?`
  ).bind(userId).all();

  const userReps = await env.CIVIC_DB.prepare(
    `SELECT bioguide_id FROM representatives
     WHERE state = ? AND (district = ? OR chamber = 'senate')`
  ).bind(user.state, user.district).all();

  // Get recent news articles
  const recentNews = await env.CIVIC_DB.prepare(`
    SELECT
      na.*,
      GROUP_CONCAT(ntb.bill_id) as related_bills
    FROM news_articles na
    LEFT JOIN news_to_bills ntb ON na.id = ntb.news_article_id
    WHERE na.published_at > datetime('now', '-7 days')
    GROUP BY na.id
    ORDER BY na.published_at DESC
    LIMIT ?
  `).bind(options.limit || 50).all();

  // Score each article
  const scoredArticles = recentNews.results.map(article => {
    let score = 0;

    // 1. Tracked bills (40%)
    const relatedBills = article.related_bills?.split(',') || [];
    const trackedBillIds = trackedBills.results.map(tb => tb.bill_id);
    const billMatches = relatedBills.filter(bid => trackedBillIds.includes(bid));
    score += (billMatches.length > 0 ? 0.4 : 0);

    // 2. User interests (30%)
    const userInterests = user.interests || [];
    const articleTags = JSON.parse(article.ai_topic_tags || '[]');
    const interestMatches = articleTags.filter(tag =>
      userInterests.some(interest => tag.toLowerCase().includes(interest.toLowerCase()))
    );
    score += (interestMatches.length / Math.max(articleTags.length, 1)) * 0.3;

    // 3. Geography - rep mentions (20%)
    // Check if article mentions user's representatives
    const repMentions = checkRepMentions(article, userReps.results);
    score += (repMentions ? 0.2 : 0);

    // 4. Recency (10%)
    const hoursSincePublished =
      (Date.now() - new Date(article.published_at).getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - (hoursSincePublished / 168)); // 1 week decay
    score += recencyScore * 0.1;

    return {
      ...article,
      relevanceScore: score,
      matchReasons: {
        trackedBills: billMatches,
        interests: interestMatches,
        repMentions
      }
    };
  });

  // Sort by score and return top results
  return scoredArticles
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(options.offset || 0, (options.offset || 0) + (options.limit || 20));
}
```

### 3.4 News Feed Organization

**Dashboard Sections**:

```typescript
// lib/news/feed-sections.ts
export interface NewsFeedSections {
  todaysMustRead: PersonalizedNewsArticle[]; // Top 3 by relevance
  billUpdates: PersonalizedNewsArticle[];     // News about tracked bills
  yourRepsInNews: PersonalizedNewsArticle[];  // Rep-specific news
  byTopic: {
    [topic: string]: PersonalizedNewsArticle[];
  };
}

export async function getOrganizedNewsFeed(
  userId: string,
  env: Env
): Promise<NewsFeedSections> {
  const allNews = await getPersonalizedNewsFeed(userId, env, { limit: 100 });

  return {
    // Top 3 highest scoring articles
    todaysMustRead: allNews.slice(0, 3),

    // Articles about tracked bills (sorted by relevance)
    billUpdates: allNews
      .filter(article => article.matchReasons.trackedBills.length > 0)
      .slice(0, 10),

    // Articles mentioning user's representatives
    yourRepsInNews: allNews
      .filter(article => article.matchReasons.repMentions)
      .slice(0, 10),

    // Grouped by AI-generated topics
    byTopic: groupByTopics(allNews)
  };
}
```

### 3.5 Marketplace-Style Podcast Enhancement

**Integration Point**: Podcast generation queue

```typescript
// lib/podcast/generator-with-news.ts (Enhanced)
export async function generatePodcastWithNews(
  userId: string,
  type: 'daily' | 'weekly',
  env: Env
): Promise<PodcastEpisode> {
  // 1. Get user's tracked bills
  const trackedBills = await getTrackedBills(userId, env);

  // 2. Get personalized news feed
  const newsFeed = await getPersonalizedNewsFeed(userId, env, { limit: 10 });

  // 3. Get bill-specific news for top 3 bills
  const billsWithNews = await Promise.all(
    trackedBills.slice(0, 3).map(async bill => {
      const relatedNews = await getBillNews(bill.id, env);
      return { bill, news: relatedNews };
    })
  );

  // 4. Generate Marketplace-style dialogue script
  const script = await env.AI.run('@cf/anthropic/claude-sonnet-4', {
    messages: [{
      role: 'user',
      content: generateMarketplacePrompt(type, billsWithNews, newsFeed)
    }]
  });

  // 5. Generate audio with ElevenLabs text-to-dialogue
  const audioBuffer = await generateDialogueAudio(script.result, env);

  // 6. Upload to Vultr Storage
  const audioUrl = await uploadToVultr(audioBuffer, userId, type, env);

  // 7. Save episode with news references
  const episode = await env.CIVIC_DB.prepare(`
    INSERT INTO podcasts (
      user_id, type, audio_url, transcript,
      bills_covered, news_referenced, generated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userId,
    type,
    audioUrl,
    JSON.stringify(script.result),
    JSON.stringify(billsWithNews.map(b => b.bill.id)),
    JSON.stringify(newsFeed.map(n => n.id)),
    new Date().toISOString()
  ).run();

  return {
    id: episode.meta.last_row_id,
    audioUrl,
    duration: type === 'daily' ? 420 : 1080, // 7 min or 18 min
    transcript: script.result,
    billsCovered: billsWithNews,
    newsReferenced: newsFeed
  };
}

function generateMarketplacePrompt(
  type: 'daily' | 'weekly',
  billsWithNews: any[],
  topNews: any[]
): string {
  return `You are creating a ${type} podcast episode for Civic Pulse in the style of NPR's Marketplace.

HOSTS: Sarah (enthusiastic, conversational) and James (analytical, grounded)

STYLE GUIDELINES:
- Start with breaking news from The Hill or Politico
- Connect news to legislation seamlessly
- Use conversational language (like Marketplace host Kai Ryssdal)
- Include real-world impact examples
- End with actionable insights

${type === 'daily' ? `
DAILY BRIEF STRUCTURE (5-7 minutes):
1. Opening (30 sec) - Hook with today's top news
2. News + Bill #1 (2 min) - Breaking news context + bill explanation
3. News + Bill #2 (2 min) - Second story with legislative connection
4. Closing (30 sec) - What this means for you + call to action
` : `
WEEKLY DEEP DIVE STRUCTURE (15-18 minutes):
1. Opening (1 min) - Week's top 3 news stories overview
2. Deep Dive #1 (5 min) - Major bill with news context
3. Deep Dive #2 (5 min) - Second major bill with news context
4. Quick Hits (3 min) - 3-4 other bills worth watching
5. Closing (1 min) - What to watch next week
`}

TOP NEWS (from The Hill & Politico):
${JSON.stringify(topNews.slice(0, 3), null, 2)}

BILLS WITH NEWS CONTEXT:
${JSON.stringify(billsWithNews, null, 2)}

Return ONLY a JSON array of dialogue objects:
[
  { "host": "sarah", "text": "Good morning! Breaking news from The Hill..." },
  { "host": "james", "text": "That's right Sarah, and this connects to..." }
]`;
}
```

---

## 4. API Endpoints

### 4.1 News Feed API

```typescript
// app/api/news/feed/route.ts
import { Env } from '@/raindrop.gen';

export async function GET(request: Request, env: Env) {
  const userId = await getUserIdFromSession(request);
  const { searchParams } = new URL(request.url);

  const sections = await getOrganizedNewsFeed(userId, env);

  return Response.json(sections);
}
```

### 4.2 Bill-Specific News API

```typescript
// app/api/news/for-bill/[billId]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { billId: string } },
  env: Env
) {
  const newsArticles = await env.CIVIC_DB.prepare(`
    SELECT
      na.*,
      ntb.relevance_score,
      ntb.matched_keywords
    FROM news_articles na
    JOIN news_to_bills ntb ON na.id = ntb.news_article_id
    WHERE ntb.bill_id = ?
    ORDER BY ntb.relevance_score DESC, na.published_at DESC
    LIMIT 10
  `).bind(params.billId).all();

  return Response.json(newsArticles.results);
}
```

### 4.3 Representative-Specific News API

```typescript
// app/api/news/for-rep/[bioguideId]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { bioguideId: string } },
  env: Env
) {
  const rep = await env.CIVIC_DB.prepare(
    `SELECT name FROM representatives WHERE bioguide_id = ?`
  ).bind(params.bioguideId).first<{ name: string }>();

  // Semantic search for rep name in news articles
  const results = await env.NEWS_ARTICLES.search({
    input: rep.name,
    requestId: `rep-${params.bioguideId}-news`
  });

  return Response.json(results.results);
}
```

---

## 5. UI Components

### 5.1 Dashboard News Feed

```typescript
// components/dashboard/news-feed.tsx
export function DashboardNewsFeed({ sections }: { sections: NewsFeedSections }) {
  return (
    <div className="space-y-8">
      {/* Today's Must-Read */}
      <section>
        <h2 className="text-2xl font-bold mb-4">📰 Today's Must-Read</h2>
        <div className="grid gap-4">
          {sections.todaysMustRead.map(article => (
            <NewsCard
              key={article.id}
              article={article}
              showRelevance
              size="large"
            />
          ))}
        </div>
      </section>

      {/* Bill Updates */}
      {sections.billUpdates.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">📋 Your Bill Updates</h2>
          <div className="grid gap-3">
            {sections.billUpdates.map(article => (
              <NewsCard
                key={article.id}
                article={article}
                showBillTags
              />
            ))}
          </div>
        </section>
      )}

      {/* Your Reps in the News */}
      {sections.yourRepsInNews.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">👥 Your Reps in the News</h2>
          <div className="grid gap-3">
            {sections.yourRepsInNews.map(article => (
              <NewsCard
                key={article.id}
                article={article}
                showRepTags
              />
            ))}
          </div>
        </section>
      )}

      {/* By Topic */}
      {Object.entries(sections.byTopic).map(([topic, articles]) => (
        <section key={topic}>
          <h2 className="text-xl font-semibold mb-3 capitalize">{topic}</h2>
          <div className="grid gap-2">
            {articles.slice(0, 5).map(article => (
              <NewsCard
                key={article.id}
                article={article}
                size="compact"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

### 5.2 Bill Page Related News

```typescript
// components/bills/related-news.tsx
export function BillRelatedNews({ billId }: { billId: string }) {
  const { data: news } = useSWR(`/api/news/for-bill/${billId}`);

  if (!news?.length) return null;

  return (
    <section className="mt-8">
      <h3 className="text-lg font-semibold mb-4">📰 Related News</h3>
      <div className="space-y-3">
        {news.map((article: any) => (
          <div key={article.id} className="border-l-4 border-blue-500 pl-4">
            <a
              href={article.url}
              target="_blank"
              className="font-medium hover:underline"
            >
              {article.title}
            </a>
            <p className="text-sm text-muted-foreground mt-1">
              {article.source} • {formatDate(article.published_at)}
              {article.relevance_score && (
                <span className="ml-2 text-xs bg-blue-100 px-2 py-0.5 rounded">
                  {Math.round(article.relevance_score * 100)}% relevant
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

## 6. Deployment & Configuration

### 6.1 Raindrop Manifest Updates

```hcl
# raindrop.manifest
application "civic-pulse" {
  # Existing resources
  sql_database "civic-db" {}

  # NEW: News/RSS resources
  kv_cache "news-feed-cache" {}

  smartbucket "news-articles" {}

  queue "news-processing-queue" {}

  task "rss-poller" {
    schedule = "0 * * * *"  # Every hour
  }

  observer "news-processor" {
    source {
      queue = "news-processing-queue"
    }
  }

  service "news-api" {
    visibility = "public"
  }
}
```

### 6.2 Environment Variables

```bash
# RSS Feed Sources
THE_HILL_RSS_BASE_URL=https://thehill.com/rss/feed
POLITICO_RSS_BASE_URL=https://www.politico.com/rss

# News Processing
NEWS_PROCESSING_BATCH_SIZE=10
NEWS_RETENTION_DAYS=30
NEWS_CACHE_TTL_SECONDS=3600

# AI Configuration
CLAUDE_MODEL=@cf/anthropic/claude-sonnet-4
LLAMA_MODEL=@cf/meta/llama-3-8b-instruct
```

---

## 7. Success Metrics

**Technical Metrics**:
- RSS feed fetch success rate: >99%
- News-to-bill matching accuracy: >70%
- Average relevance score for personalized feeds: >0.6
- API response time (news feed): <200ms
- SmartBucket search latency: <500ms

**User Engagement Metrics**:
- News article click-through rate: >15%
- Time spent on news feed: >2 min/session
- Bills tracked from news articles: >1/week/user
- Podcast completion rate (with news): >60%

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up RSS feed sources configuration
- [ ] Implement KV Cache for feed caching
- [ ] Create Task for scheduled polling
- [ ] Build basic RSS parser

### Phase 2: Storage & Processing (Week 1-2)
- [ ] Create SQL schema for news articles
- [ ] Set up SmartBuckets for article storage
- [ ] Build Queue + Observer for article processing
- [ ] Implement AI-powered categorization

### Phase 3: Matching & Scoring (Week 2)
- [ ] Develop news-to-bill matching algorithm
- [ ] Implement personalized feed scoring
- [ ] Create feed organization logic
- [ ] Build caching layer for performance

### Phase 4: API & UI (Week 2-3)
- [ ] Create news feed API endpoints
- [ ] Build bill-specific news API
- [ ] Create rep-specific news API
- [ ] Implement dashboard news components

### Phase 5: Podcast Enhancement (Week 3)
- [ ] Integrate news into podcast generation
- [ ] Update Claude prompts for Marketplace style
- [ ] Test dialogue quality with news context
- [ ] Optimize audio generation pipeline

### Phase 6: Polish & Launch (Week 3-4)
- [ ] Performance optimization
- [ ] Error handling & monitoring
- [ ] User testing & feedback
- [ ] Documentation & deployment

---

## 9. Technical Considerations

### 9.1 Performance Optimization

**Caching Strategy**:
- RSS feeds: 1 hour TTL in KV Cache
- Personalized feeds: 15 min TTL per user
- Bill news: 30 min TTL per bill
- SmartBucket search: Cache results for repeated queries

**Database Indexing**:
- Index on `news_articles.published_at` for recency queries
- Index on `news_to_bills.bill_id` for bill-specific news
- Index on `news_articles.category` for topic filtering

### 9.2 Error Handling

**RSS Feed Failures**:
- Retry with exponential backoff (3 attempts)
- Fall back to cached version if available
- Alert if source is down >6 hours

**Processing Failures**:
- Dead letter queue for failed articles
- Manual review dashboard for flagged content
- Automatic retry for transient errors

### 9.3 Scaling Considerations

**Queue Throughput**:
- Process 100 articles/hour (typical load)
- Handle spikes up to 500 articles/hour
- Batch processing for efficiency

**SmartBucket Limits**:
- Max 10,000 articles in SmartBucket
- Rolling 30-day window (delete old articles)
- Separate buckets for archival if needed

---

## 10. Next Steps

1. **Review this plan** with stakeholders
2. **Validate Raindrop patterns** with platform documentation
3. **Create database migration** for news tables
4. **Start Phase 1 implementation** (RSS polling)
5. **Build monitoring dashboard** for news pipeline health

---

**Questions? Contact the development team.**
