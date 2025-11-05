# 🎯 HakiVo Enhanced Dashboard - Complete Implementation Plan

**Version:** 2.0
**Date:** 2025-11-04
**Purpose:** Transform /dashboard into an intelligent, personalized civic engagement hub with real-time feeds, AI-powered recommendations, and multi-source news aggregation

---

## 📊 Executive Summary

This plan enhances the HakiVo dashboard by combining:
- **Personalized AI recommendations** using SmartMemory & SmartBuckets
- **Real-time representative activity** via Twitter/X API
- **Multi-source news aggregation** from The Hill, Politico, and Congress.gov
- **AI-powered conversational interface** with Perplexity AI integration
- **Adaptive learning system** that improves with user engagement

**Current State:**
- ✅ Basic podcast generation (daily/weekly)
- ✅ SmartBucket indexing (Congress 118 & 119 bills)
- ✅ User onboarding (location, preferences)
- ✅ Persistent audio player

**Gaps to Address:**
- ❌ No personalized recommendations
- ❌ No representative activity tracking
- ❌ No external news aggregation
- ❌ No conversational AI interface
- ❌ No learning from user behavior

---

## 🆕 New Features Overview

### 1. Representative Twitter Feed Widget
Display real-time social media activity from user's elected representatives.

**Data Source:** Twitter/X API v2
**Update Frequency:** Real-time with 15-minute polling fallback
**Content:** Tweets, retweets, replies from House and Senate representatives

**Key Features:**
- Filter by representative (dropdown: All, House, Senate, specific rep)
- Show engagement metrics (likes, retweets, replies)
- Link to full tweet threads
- Highlight legislation-related tweets
- "See all tweets >" link to full feed page

**Design:**
```
┌─────────────────────────────────────────────────────┐
│ Representative Activity         [Filter: All Reps ▾]│
├─────────────────────────────────────────────────────┤
│ 🐦 2 min  Sen. Elizabeth Warren (@SenWarren)       │
│           "Just voted YES on the Clean Energy..."   │
│           💬 45  🔄 128  ❤️ 892                      │
├─────────────────────────────────────────────────────┤
│ 🐦 15 min Rep. John Doe (@RepDoe)                   │
│           "Proud to co-sponsor HR-3458..."          │
│           💬 12  🔄 34  ❤️ 256                       │
├─────────────────────────────────────────────────────┤
│                           See all tweets >          │
└─────────────────────────────────────────────────────┘
```

### 2. Personalized Legislation Feed Widget
Smart feed of bills matching user interests with policy area filtering.

**Data Source:** SmartBuckets + Congress.gov API
**Update Frequency:** Real-time + daily batch indexing
**Personalization:** Based on user preferences + SmartMemory interactions

**Design (matching screenshot):**
```
┌─────────────────────────────────────────────────────┐
│ Latest Legislation          [All categories      ▾] │
├─────────────────────────────────────────────────────┤
│ 3 min   HR-3458: Renewable Energy Investment Act    │
│         Introduced by your rep, John Doe             │
├─────────────────────────────────────────────────────┤
│ 30 min  S-1234: Healthcare Access Expansion Act     │
│         Matches your interest: Healthcare            │
├─────────────────────────────────────────────────────┤
│ 1 hr    HR-5678: Student Loan Forgiveness Act       │
│         Co-sponsored by Elizabeth Warren             │
├─────────────────────────────────────────────────────┤
│ 2 hrs   S-9012: Climate Resilience Infrastructure   │
│         Matches your interest: Climate               │
├─────────────────────────────────────────────────────┤
│                           See all bills >            │
└─────────────────────────────────────────────────────┘
```

**Policy Categories Dropdown:**
- All categories (default)
- Climate & Environment
- Healthcare
- Education
- Economy & Jobs
- Defense & Security
- Immigration
- Technology & Innovation
- Civil Rights & Justice
- Infrastructure
- Energy
- Agriculture
- Foreign Policy

### 3. News Aggregation Widget
Multi-source news feed from The Hill, Politico, and congressional activity.

**Data Sources:**
- **The Hill API** - Congressional news and analysis
- **Politico API** - Political news and updates
- **Congress.gov** - Official legislative updates
- **RSS Feeds** - Fallback for real-time updates

**Update Frequency:** 15-minute polling + real-time webhooks
**Personalization:** Filter by user interests + local representatives

**Design:**
```
┌─────────────────────────────────────────────────────┐
│ Political News                  [Filter: All     ▾] │
├─────────────────────────────────────────────────────┤
│ 📰 5 min   The Hill                                  │
│            Senate Passes Major Climate Bill 52-48    │
│            🔗 Read full story                        │
├─────────────────────────────────────────────────────┤
│ 📰 20 min  Politico                                  │
│            House Democrats Unveil Healthcare Plan    │
│            🔗 Read full story                        │
├─────────────────────────────────────────────────────┤
│ 📰 1 hr    Congress.gov                              │
│            HR-3458 Advances to Senate Floor          │
│            🔗 View bill details                      │
├─────────────────────────────────────────────────────┤
│                           See all news >             │
└─────────────────────────────────────────────────────┘
```

**News Filter Options:**
- All sources
- The Hill only
- Politico only
- Congress.gov only
- Bills I'm tracking
- My representatives
- My interests

### 4. Perplexity AI Assistant Widget
Conversational AI interface for legislative Q&A with personalized context.

**Data Source:** Perplexity API + SmartMemory + SmartBuckets
**Model:** Perplexity Sonar (latest)
**Context:** User preferences + tracked bills + past conversations

**Design:**
```
┌─────────────────────────────────────────────────────┐
│ 💬 Ask About Legislation                            │
├─────────────────────────────────────────────────────┤
│ Suggested questions based on your interests:         │
│                                                      │
│ 💡 What's the latest on climate legislation?        │
│ 💡 Did my rep vote on HR-3458?                      │
│ 💡 Explain the Student Loan Forgiveness Act         │
│ 💡 What bills are being debated this week?          │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Ask me anything...                              │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Key Features:**
- Suggested questions based on user interests
- Remembers past conversations (SmartMemory)
- Can search bills (SmartBuckets)
- Can explain legislative processes
- Can summarize representative activity
- Can generate personalized podcast ideas
- Real-time responses with streaming

**Example Interactions:**
```
User: "What did Elizabeth Warren vote on this week?"

Perplexity: "Senator Elizabeth Warren voted on 3 bills this week:

1. ✅ YES - HR-3458 (Clean Energy Investment Act)
2. ❌ NO - S-9012 (Defense Budget Increase)
3. ✅ YES - HR-1234 (Student Loan Relief Act)

Would you like me to explain any of these votes or generate
a podcast covering Warren's voting record?"
```

---

## 🏗️ Technical Architecture

### Raindrop Services Configuration

```hcl
# raindrop.manifest

application "hakivo" {
  # Web service
  service "web" {
    domain = "hakivo.netlify.app"
  }

  # Smart personalization
  smartmemory "user_memory" {}
  smartbucket "bills_rag" {}  # Already exists
  smartsql "analytics" {}

  # AI capabilities
  ai "personalization_engine" {}
  ai "conversation_agent" {}
  ai "perplexity_proxy" {}  # For Perplexity API integration

  # Background jobs
  queue "recommendation_updates" {}
  queue "news_aggregation" {}
  queue "twitter_polling" {}

  # Observers for real-time updates
  observer "user_behavior_tracker" {}
  observer "bill_update_monitor" {}
  observer "news_feed_monitor" {}

  # KV Cache for API responses
  kv_cache "api_responses" {}
  kv_cache "news_cache" {}
  kv_cache "twitter_cache" {}
}
```

### External API Integrations

**1. Twitter/X API v2**
- **Endpoint:** `https://api.twitter.com/2/`
- **Auth:** Bearer token (OAuth 2.0)
- **Rate Limits:** 500 requests/15 min (with Essential access)
- **Cost:** Free tier available, $100/month for Basic
- **Key Endpoints:**
  - `/users/:id/tweets` - Get user timeline
  - `/tweets/search/recent` - Search tweets
  - `/users/by` - Get user info by username

**2. The Hill API**
- **Endpoint:** `https://thehill.com/api/`
- **Auth:** API key
- **Rate Limits:** 1000 requests/day
- **Cost:** Contact for pricing
- **Fallback:** RSS feed parsing if API unavailable

**3. Politico API**
- **Endpoint:** `https://www.politico.com/api/`
- **Auth:** API key
- **Rate Limits:** 500 requests/day
- **Cost:** Contact for pricing
- **Fallback:** RSS feed parsing if API unavailable

**4. Perplexity API**
- **Endpoint:** `https://api.perplexity.ai/`
- **Auth:** Bearer token
- **Model:** `sonar` (latest)
- **Rate Limits:** Based on plan
- **Cost:** $5/million tokens (Pro plan)
- **Features:** Streaming responses, citations, real-time search

**5. Congress.gov API** (existing)
- Already integrated
- 1 req/sec rate limit
- Free tier

---

## 💾 Database Schema Updates

```sql
-- Track user interactions (SmartSQL)
CREATE TABLE IF NOT EXISTS user_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL, -- 'bill_view', 'podcast_listen', 'search', 'chat_query', 'news_click', 'tweet_click'
  target_id TEXT, -- bill_id, podcast_id, news_article_id, tweet_id
  metadata JSON, -- Additional context
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User preference profiles (enhanced)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  policy_interests JSON, -- ['climate', 'healthcare', 'education', ...]
  notification_preferences JSON, -- Email, push, SMS settings
  news_sources JSON, -- ['the-hill', 'politico', 'congress']
  twitter_feed_enabled BOOLEAN DEFAULT TRUE,
  perplexity_enabled BOOLEAN DEFAULT TRUE,
  learning_style TEXT, -- 'quick', 'detailed', 'audio-focused'
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Bill tracking (enhanced)
CREATE TABLE IF NOT EXISTS tracked_bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  tracking_reason TEXT, -- 'user_selected', 'auto_suggested', 'representative_activity'
  notify_on_update BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, bill_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (bill_id) REFERENCES bills(id)
);

-- Representative social media cache
CREATE TABLE IF NOT EXISTS representative_tweets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bioguide_id TEXT NOT NULL, -- Representative ID
  tweet_id TEXT UNIQUE NOT NULL,
  tweet_text TEXT NOT NULL,
  tweet_url TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  retweets_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  is_legislation_related BOOLEAN DEFAULT FALSE,
  mentioned_bills JSON, -- Array of bill IDs mentioned
  created_at DATETIME NOT NULL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bioguide_id) REFERENCES representatives(bioguide_id)
);

-- News articles cache
CREATE TABLE IF NOT EXISTS news_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL, -- 'the-hill', 'politico', 'congress'
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT NOT NULL,
  author TEXT,
  published_at DATETIME NOT NULL,
  policy_categories JSON, -- ['climate', 'healthcare', ...]
  mentioned_bills JSON, -- Array of bill IDs
  mentioned_representatives JSON, -- Array of bioguide IDs
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Perplexity chat sessions
CREATE TABLE IF NOT EXISTS perplexity_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  session_id TEXT UNIQUE NOT NULL, -- SmartMemory session ID
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  sources JSON, -- Citations from Perplexity
  tokens_used INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Widget personalization settings
CREATE TABLE IF NOT EXISTS widget_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  widget_type TEXT NOT NULL, -- 'twitter', 'legislation', 'news', 'perplexity'
  is_visible BOOLEAN DEFAULT TRUE,
  position INTEGER, -- Dashboard order
  filter_settings JSON, -- Widget-specific filters
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, widget_type),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- News reading history
CREATE TABLE IF NOT EXISTS news_reading_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  read_duration_seconds INTEGER,
  clicked_through BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (article_id) REFERENCES news_articles(article_id)
);
```

---

## 🎨 Dashboard UI Component Breakdown

### Page Layout Structure

```
┌────────────────────────────────────────────────────────┐
│  📱 HakiVo Dashboard - Personalized for [User Name]   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  🎯 For You Hero Section                     │    │
│  │  "Here's what's happening in Climate Policy" │    │
│  │  [3-4 recommended bills with AI explanation] │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  ┌─────────────────┐  ┌─────────────────┐           │
│  │ 📜 Latest       │  │ 🐦 Representative│           │
│  │ Legislation     │  │ Activity         │           │
│  │ [Dropdown]      │  │ [Filter]         │           │
│  │                 │  │                  │           │
│  │ Bill feed...    │  │ Tweet feed...    │           │
│  │                 │  │                  │           │
│  │ See all bills > │  │ See all tweets > │           │
│  └─────────────────┘  └─────────────────┘           │
│                                                        │
│  ┌─────────────────┐  ┌─────────────────┐           │
│  │ 📰 Political    │  │ 🎙️ Your Podcast │           │
│  │ News            │  │ Queue            │           │
│  │ [Filter]        │  │                  │           │
│  │                 │  │ Personalized     │           │
│  │ News feed...    │  │ briefs ready     │           │
│  │                 │  │                  │           │
│  │ See all news >  │  │ Generate new >   │           │
│  └─────────────────┘  └─────────────────┘           │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  💬 Ask About Legislation (Perplexity AI)   │    │
│  │  [Suggested questions]                        │    │
│  │  [Chat input]                                 │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  📊 Your Civic Impact                         │    │
│  │  [Analytics cards: bills explored, listening  │    │
│  │   time, topics learned, etc.]                 │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Component Hierarchy

**1. DashboardLayout** (`app/dashboard/page.tsx`)
```typescript
<DashboardLayout user={user}>
  <HeroSection user={user} />
  <WidgetGrid>
    <LegislationFeedWidget user={user} />
    <TwitterFeedWidget representatives={reps} />
    <NewsFeedWidget sources={sources} />
    <PodcastQueueWidget user={user} />
  </WidgetGrid>
  <PerplexityChat user={user} />
  <CivicImpactDashboard user={user} />
</DashboardLayout>
```

**2. Shared Widget Pattern** (`components/dashboard/widgets/`)
```typescript
// Base widget component
interface WidgetProps {
  title: string;
  filterOptions?: FilterOption[];
  defaultFilter?: string;
  updateInterval?: number;
  className?: string;
}

// Widget container with standardized styling
<WidgetContainer {...props}>
  <WidgetHeader title={title} filter={filter} />
  <WidgetContent>
    {/* Widget-specific content */}
  </WidgetContent>
  <WidgetFooter link={seeAllLink} />
</WidgetContainer>
```

### Individual Widget Components

**LegislationFeedWidget** (`components/dashboard/widgets/LegislationFeedWidget.tsx`)
```typescript
interface LegislationFeedProps {
  user: User;
  limit?: number; // Default: 5
}

// Features:
// - Dropdown for policy categories
// - Real-time updates from SmartBuckets
// - Personalized based on user interests
// - Shows timestamp, bill title, relevance reason
// - "See all bills >" link to /bills
```

**TwitterFeedWidget** (`components/dashboard/widgets/TwitterFeedWidget.tsx`)
```typescript
interface TwitterFeedProps {
  representatives: Representative[];
  limit?: number; // Default: 5
}

// Features:
// - Filter dropdown (All, House, Senate, specific rep)
// - Tweet cards with engagement metrics
// - Highlight legislation-related tweets
// - Link to full tweet on Twitter
// - "See all tweets >" link to /representatives/social
```

**NewsFeedWidget** (`components/dashboard/widgets/NewsFeedWidget.tsx`)
```typescript
interface NewsFeedProps {
  sources: NewsSource[];
  limit?: number; // Default: 5
}

// Features:
// - Filter dropdown (All, The Hill, Politico, Congress.gov)
// - Source badges with icons
// - Article cards with timestamp and headline
// - "Read full story" link
// - "See all news >" link to /news
```

**PerplexityChat** (`components/dashboard/widgets/PerplexityChat.tsx`)
```typescript
interface PerplexityChatProps {
  user: User;
  sessionId?: string;
}

// Features:
// - Suggested questions based on interests
// - Chat input with autocomplete
// - Streaming responses
// - Citation links
// - Message history (SmartMemory)
// - "Generate podcast" action button
```

---

## 🚀 Phased Implementation Plan

### Phase 1: Foundation & Memory System (Week 1)

**Objective:** Set up SmartMemory tracking and user preference management

**Tasks:**
1. ✅ Set up SmartMemory integration
   - Configure `smartmemory "user_memory"` in raindrop.manifest
   - Generate service bindings with `raindrop build generate`
   - Test working memory session creation

2. ✅ Implement user interaction tracking
   - Create `trackInteraction` helper function
   - Add tracking to bill views, podcast listens, searches
   - Store interactions in SmartMemory working memory

3. ✅ Build user preference system
   - Create database schema for `user_profiles`
   - Implement preference update API routes
   - Add preference UI in /settings

4. ✅ Initialize procedural memory
   - Store system prompts for personalization
   - Store user onboarding data templates
   - Store recommendation algorithms

**Deliverables:**
- SmartMemory fully integrated
- User interactions tracked in real-time
- Preference management system live
- Foundation for personalization ready

**Testing:**
- Verify working memory sessions persist
- Confirm interactions are stored correctly
- Test preference updates reflect immediately

---

### Phase 2: Smart Recommendations & Legislation Widget (Week 2)

**Objective:** Build personalized "For You" section and legislation feed

**Tasks:**
1. ✅ Build SmartBucket search integration
   - Create `searchRelevantBills` function using SmartBuckets
   - Implement semantic search with user interests
   - Add local representative filtering

2. ✅ Create legislation feed widget
   - Design `LegislationFeedWidget` component
   - Implement dropdown for policy categories
   - Add real-time updates (15-min polling)
   - Show timestamp and relevance reasons

3. ✅ Build "For You" hero section
   - Display top 3-4 recommended bills
   - Add AI-generated explanations for why bills are relevant
   - Include CTA buttons (Listen, Track, Share)

4. ✅ Implement bill tracking system
   - Create `tracked_bills` table
   - Add "Track Bill" button to bill cards
   - Show tracking status in legislation feed

**Deliverables:**
- Personalized legislation feed live
- "For You" hero section deployed
- Bill tracking functional
- Widget follows screenshot design

**Testing:**
- Verify recommendations change based on user interests
- Test dropdown filtering works correctly
- Confirm tracking persists across sessions

---

### Phase 3: Twitter Feed & Representative Activity (Week 3)

**Objective:** Integrate Twitter/X API and display representative social activity

**Tasks:**
1. ✅ Set up Twitter/X API integration
   - Obtain Twitter API credentials (Bearer token)
   - Create `lib/api/twitter.ts` client
   - Implement rate limiting and caching

2. ✅ Build representative Twitter fetching
   - Create `fetchRepresentativeTweets` function
   - Map representative names to Twitter handles
   - Cache tweets in `representative_tweets` table

3. ✅ Create Twitter feed widget
   - Design `TwitterFeedWidget` component
   - Implement filter dropdown (All, House, Senate, specific rep)
   - Display tweet cards with engagement metrics
   - Add "See all tweets >" link

4. ✅ Highlight legislation-related tweets
   - Use AI to detect bill mentions in tweets
   - Extract bill IDs and link to /bills pages
   - Add special badge for legislation tweets

5. ✅ Set up background polling
   - Create queue job for Twitter polling (every 15 min)
   - Implement error handling and retry logic
   - Monitor rate limits

**Deliverables:**
- Twitter feed widget live on dashboard
- Representative tweets cached and searchable
- Legislation detection working
- Background polling operational

**Testing:**
- Verify tweets update in real-time
- Test filter dropdown works correctly
- Confirm rate limits are respected

**Environment Variables:**
```bash
TWITTER_BEARER_TOKEN=your-bearer-token
TWITTER_API_VERSION=2
```

---

### Phase 4: News Aggregation & Multi-Source Feed (Week 4)

**Objective:** Aggregate news from The Hill, Politico, and Congress.gov

**Tasks:**
1. ✅ Set up external news APIs
   - Obtain The Hill API key
   - Obtain Politico API key
   - Create `lib/api/news.ts` client
   - Implement RSS feed parsing as fallback

2. ✅ Build news fetching system
   - Create `fetchTheHillNews` function
   - Create `fetchPoliticoNews` function
   - Create `fetchCongressNews` function (existing API)
   - Unify response format across sources

3. ✅ Create news cache system
   - Store articles in `news_articles` table
   - Implement deduplication logic
   - Extract policy categories and bill mentions

4. ✅ Build news feed widget
   - Design `NewsFeedWidget` component
   - Implement source filter dropdown
   - Display article cards with source badges
   - Add "Read full story" links

5. ✅ Personalize news feed
   - Filter by user interests (policy categories)
   - Highlight articles mentioning tracked bills
   - Highlight articles about local representatives

6. ✅ Set up background aggregation
   - Create queue job for news polling (every 15 min)
   - Implement webhook handlers if available
   - Monitor API usage and rate limits

**Deliverables:**
- News feed widget live on dashboard
- Multi-source aggregation working
- News cache populated and searchable
- Personalization filters active

**Testing:**
- Verify all news sources appear
- Test filter dropdown works correctly
- Confirm personalization reflects user interests

**Environment Variables:**
```bash
THE_HILL_API_KEY=your-api-key
POLITICO_API_KEY=your-api-key
NEWS_POLLING_INTERVAL=900000 # 15 minutes
```

---

### Phase 5: Perplexity AI Conversational Interface (Week 5)

**Objective:** Add AI-powered Q&A with Perplexity API

**Tasks:**
1. ✅ Set up Perplexity API integration
   - Obtain Perplexity API key
   - Create `lib/api/perplexity.ts` client
   - Implement streaming responses

2. ✅ Build Perplexity chat service
   - Create API route `/api/chat/perplexity`
   - Integrate with SmartMemory for context
   - Add citation parsing and formatting

3. ✅ Create chat widget component
   - Design `PerplexityChat` component
   - Implement suggested questions based on interests
   - Add chat input with autocomplete
   - Display streaming responses with citations

4. ✅ Enhance context with SmartMemory
   - Retrieve user's episodic memory (past chats)
   - Include tracked bills in context
   - Add semantic memory (domain knowledge)

5. ✅ Add special actions
   - "Generate podcast" button for interesting queries
   - "Track bill" button for bill-related responses
   - "Share conversation" for social sharing

6. ✅ Implement chat session management
   - Store sessions in `perplexity_sessions` table
   - Link to SmartMemory session IDs
   - Enable session rehydration

**Deliverables:**
- Perplexity chat widget live
- Streaming responses working
- Context-aware conversations
- Special actions functional

**Testing:**
- Verify responses include citations
- Test streaming works smoothly
- Confirm context improves over time

**Environment Variables:**
```bash
PERPLEXITY_API_KEY=your-api-key
PERPLEXITY_MODEL=sonar
PERPLEXITY_MAX_TOKENS=1000
```

---

### Phase 6: Analytics, Learning & Optimization (Week 6)

**Objective:** Implement analytics dashboard and adaptive learning

**Tasks:**
1. ✅ Build civic impact dashboard
   - Create `CivicImpactDashboard` component
   - Show bills explored, listening time, topics learned
   - Display engagement metrics and badges

2. ✅ Implement learning algorithms
   - Analyze user behavior patterns
   - Update semantic memory with learned preferences
   - Adjust recommendation weights

3. ✅ Add adaptive content length
   - Track podcast completion rates
   - Adjust brief length based on user behavior
   - Personalize podcast format (quick vs detailed)

4. ✅ Build intelligent notifications
   - Only notify about truly relevant updates
   - Use semantic similarity for relevance scoring
   - Implement notification preferences

5. ✅ Optimize performance
   - Add caching for API responses
   - Implement lazy loading for widgets
   - Optimize database queries

6. ✅ A/B test personalization features
   - Test recommendation algorithms
   - Compare widget layouts
   - Optimize for engagement

**Deliverables:**
- Analytics dashboard live
- Learning algorithms active
- Adaptive content working
- Performance optimized

**Testing:**
- Verify learning improves recommendations
- Test adaptive length adjusts correctly
- Confirm notifications are relevant

---

### Phase 7: Polish, Testing & Launch (Week 7)

**Objective:** Final polish, comprehensive testing, and production launch

**Tasks:**
1. ✅ Comprehensive testing
   - End-to-end testing all widgets
   - Performance testing (Lighthouse 90+)
   - Mobile responsiveness testing
   - Error handling verification

2. ✅ Security audit
   - Review API key storage
   - Test rate limiting
   - Verify input sanitization
   - Check authentication flows

3. ✅ Documentation
   - Update user guide
   - Create feature tour
   - Write API documentation
   - Update CLAUDE.md

4. ✅ Deployment preparation
   - Set all environment variables in Netlify
   - Configure caching headers
   - Set up monitoring and logging
   - Prepare rollback plan

5. ✅ Gradual rollout
   - Deploy to staging first
   - Beta test with 10% of users
   - Monitor metrics and errors
   - Full production rollout

6. ✅ Post-launch monitoring
   - Monitor API usage and costs
   - Track user engagement metrics
   - Collect user feedback
   - Fix any issues immediately

**Deliverables:**
- Production-ready dashboard
- All features tested and working
- Documentation complete
- Monitoring in place

**Testing:**
- Full regression testing
- Load testing with realistic traffic
- Security penetration testing
- User acceptance testing

---

## 📡 API Routes Structure

```
app/api/
├── dashboard/
│   ├── recommendations/route.ts      # Get personalized bill recommendations
│   ├── twitter/route.ts              # Fetch representative tweets
│   ├── news/route.ts                 # Aggregate news from all sources
│   └── analytics/route.ts            # Get user analytics data
│
├── chat/
│   ├── perplexity/route.ts          # Perplexity AI chat endpoint
│   └── sessions/route.ts            # Chat session management
│
├── widgets/
│   ├── legislation/route.ts          # Legislation feed data
│   ├── twitter/route.ts              # Twitter feed data
│   ├── news/route.ts                 # News feed data
│   └── podcast-queue/route.ts        # Personalized podcast queue
│
├── tracking/
│   ├── interaction/route.ts          # Track user interactions
│   ├── bills/route.ts                # Track/untrack bills
│   └── preferences/route.ts          # Update user preferences
│
└── background/
    ├── poll-twitter/route.ts         # Background Twitter polling
    ├── poll-news/route.ts            # Background news aggregation
    └── update-recommendations/route.ts # Update user recommendations
```

---

## 🔧 Configuration & Environment Variables

**Complete .env file:**
```bash
# Next.js
NEXT_PUBLIC_APP_URL=https://hakivo.netlify.app
NODE_ENV=production

# Raindrop Platform
RAINDROP_SQL_URL=your-sql-url
RAINDROP_SMART_MEMORY_URL=your-memory-url
RAINDROP_SMART_BUCKET_URL=your-bucket-url

# Vultr Object Storage
VULTR_STORAGE_ENDPOINT=your-endpoint
VULTR_ACCESS_KEY=your-access-key
VULTR_SECRET_KEY=your-secret-key
VULTR_CDN_URL=https://cdn.hakivo.com

# External APIs
CONGRESS_API_KEY=your-congress-key
ANTHROPIC_API_KEY=your-anthropic-key
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_SARAH_VOICE_ID=your-voice-id
ELEVENLABS_JAMES_VOICE_ID=your-voice-id

# Twitter/X API
TWITTER_BEARER_TOKEN=your-bearer-token
TWITTER_API_VERSION=2

# News APIs
THE_HILL_API_KEY=your-api-key
POLITICO_API_KEY=your-api-key

# Perplexity AI
PERPLEXITY_API_KEY=your-api-key
PERPLEXITY_MODEL=sonar
PERPLEXITY_MAX_TOKENS=1000

# Stripe Payments
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-publishable-key

# WorkOS Authentication
WORKOS_API_KEY=your-workos-key
WORKOS_CLIENT_ID=your-client-id
WORKOS_REDIRECT_URI=https://hakivo.netlify.app/api/auth/callback
NEXT_PUBLIC_WORKOS_CLIENT_ID=your-client-id

# Background Jobs
NEWS_POLLING_INTERVAL=900000 # 15 minutes
TWITTER_POLLING_INTERVAL=900000 # 15 minutes
RECOMMENDATION_UPDATE_INTERVAL=3600000 # 1 hour
```

**Setting in Netlify:**
```bash
# Via CLI
netlify env:set TWITTER_BEARER_TOKEN "your-token"
netlify env:set THE_HILL_API_KEY "your-key"
netlify env:set POLITICO_API_KEY "your-key"
netlify env:set PERPLEXITY_API_KEY "your-key"

# Or via Netlify UI: Site Settings > Environment Variables
```

---

## 💰 Cost Estimates

### API Costs (Monthly)

**Twitter/X API:**
- Free tier: Limited to 1500 tweets/month (not sufficient)
- Basic tier: $100/month (50,000 tweets/month)
- **Recommended:** Basic tier

**The Hill API:**
- Contact for pricing (estimate: $50-100/month for 1000 req/day)

**Politico API:**
- Contact for pricing (estimate: $50-100/month for 500 req/day)

**Perplexity API:**
- $5 per million tokens
- Estimated 100k tokens/day = $15/month
- **Budget:** $50/month for growth

**Total External API Costs:** ~$250-300/month

### Raindrop Platform Costs
- Included in existing Raindrop subscription
- SmartMemory, SmartBuckets, SmartSQL, AI usage covered

### Optimization Strategies
- Aggressive caching (15-min cache for news/tweets)
- Batch API requests where possible
- Use RSS feeds as fallback for news
- Implement request deduplication
- Monitor usage and adjust polling intervals

---

## 📊 Success Metrics

### User Engagement
- Daily active users (target: +50% in 3 months)
- Average session duration (target: 10+ minutes)
- Widget interaction rate (target: 70%+ users interact)
- Return visit rate (target: 60%+ weekly)

### Personalization Effectiveness
- Recommendation click-through rate (target: 40%+)
- Podcast completion rate (target: 70%+)
- Bill tracking rate (target: 3+ bills per user)
- Chat engagement (target: 50%+ users ask questions)

### Content Consumption
- Bills explored per session (target: 5+)
- News articles clicked (target: 2+ per session)
- Tweets viewed (target: 10+ per session)
- Perplexity questions asked (target: 1+ per week)

### Technical Performance
- Page load time (target: <2s)
- Widget load time (target: <500ms)
- API response time (target: <300ms)
- Error rate (target: <1%)

---

## 🚨 Risk Mitigation

### API Rate Limits
**Risk:** Twitter/News APIs have strict rate limits
**Mitigation:**
- Aggressive caching (15-min cache)
- Queue system for API requests
- Fallback to RSS feeds
- Monitor usage with alerts

### API Costs
**Risk:** Unexpected API cost spikes
**Mitigation:**
- Set hard rate limits per user
- Implement cost monitoring
- Use free tiers where possible
- Budget alerts in Netlify

### Data Privacy
**Risk:** Storing user interactions and social media data
**Mitigation:**
- Clear privacy policy
- User consent for tracking
- Data encryption at rest
- GDPR compliance (right to delete)

### Performance
**Risk:** Dashboard becomes slow with all widgets
**Mitigation:**
- Lazy load widgets below fold
- Implement virtual scrolling
- Cache aggressively
- Use CDN for static assets

### External API Downtime
**Risk:** Twitter/News APIs go down
**Mitigation:**
- Graceful degradation (hide widget)
- Show cached data with staleness indicator
- RSS feed fallback
- Status page for users

---

## 🎯 Next Steps

**Immediate Actions:**
1. ✅ Review and approve this plan
2. ✅ Obtain API keys (Twitter, The Hill, Politico, Perplexity)
3. ✅ Set up Netlify environment variables
4. ✅ Create feature branches in git
5. ✅ Begin Phase 1 implementation

**Decision Points:**
- Approve external API costs (~$250-300/month)
- Confirm widget priority order
- Decide on beta testing approach
- Set launch date target

**Open Questions:**
- Should we implement mobile app push notifications?
- Do we need email digests of personalized updates?
- Should we add social sharing features?
- Do we want to support custom widget layouts?

---

## 📚 Additional Resources

**API Documentation:**
- [Twitter API v2 Docs](https://developer.twitter.com/en/docs/twitter-api)
- [Perplexity API Docs](https://docs.perplexity.ai)
- [Congress.gov API Docs](https://api.congress.gov)

**Raindrop Platform:**
- [SmartMemory Reference](https://docs.raindrop.cloud/reference/smartmemory)
- [SmartBuckets Reference](https://docs.raindrop.cloud/reference/smartbucket)
- [AI Models Reference](https://docs.raindrop.cloud/reference/ai)

**Design System:**
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## ✅ Checklist Before Starting

- [ ] All API keys obtained and tested
- [ ] Netlify environment variables set
- [ ] Database schema reviewed and approved
- [ ] UI/UX designs approved
- [ ] Budget approved ($250-300/month APIs)
- [ ] Privacy policy updated
- [ ] Development timeline agreed upon
- [ ] Beta testing plan created
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented

---

**Ready to transform civic engagement with AI-powered personalization! 🚀**
