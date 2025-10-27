# 🎙️ CIVIC PULSE - COMPREHENSIVE PRODUCT REQUIREMENTS DOCUMENT (PRD) v2.2

**Version:** 2.2 (SQL + Algolia Search Edition)
**Date:** October 27, 2025
**Project Type:** Liquid Metal Hackathon Submission
**Target Categories:** Best Voice Agent, Best AI Solution for Public Good
**Tech Stack:** Next.js 16, Raindrop Platform, Vultr Object Storage, ElevenLabs, Claude Sonnet 4, shadcn/ui

**CORRECTED FOR ACTUAL RAINDROP IMPLEMENTATION PATTERNS**

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Hackathon Requirements Compliance](#2-hackathon-requirements-compliance)
3. [Product Vision](#3-product-vision)
4. [Technical Architecture](#4-technical-architecture)
5. [Database Schema (SQL - SQLite)](#5-database-schema-sql-sqlite)
6. [Search Architecture (Algolia + SQL)](#6-search-architecture-algolia--sql)
7. [API Integrations](#7-api-integrations)
8. [Feature Specifications](#8-feature-specifications)
9. [Podcast System (Daily + Weekly)](#9-podcast-system-daily--weekly)
10. [User Experience & Design](#10-user-experience--design)
11. [Voice Agent Implementation](#11-voice-agent-implementation)
12. [Responsive Design Requirements](#12-responsive-design-requirements)
13. [Payment & Monetization](#13-payment--monetization)
14. [Hackathon Implementation Timeline](#14-hackathon-implementation-timeline)
15. [Competition Category Alignment](#15-competition-category-alignment)
16. [Deployment Strategy](#16-deployment-strategy)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Product Overview

**Civic Pulse** is an AI-powered civic engagement platform that transforms complex Congressional legislation into personalized audio briefings and interactive dashboards. Built on the Raindrop Platform with Vultr Object Storage + CDN, Civic Pulse delivers professional NPR-quality podcasts (daily 5-minute briefings + weekly 15-minute deep dives) using ElevenLabs text-to-dialogue and Claude Sonnet 4 AI analysis.

### 1.2 The Problem

- **75%** of Americans cannot name their representative
- Congressional bills average **30+ pages** of legal jargon
- **Civic disengagement** is at historic lows
- **Time poverty** - people need quick, digestible updates
- **Misinformation** thrives due to inaccessible legislation

### 1.3 The Solution

**Two-Tier Audio System:**

- **Daily Brief**: 5-7 minute morning update (NYT Daily style)
- **Weekly Deep Dive**: 15-18 minute comprehensive analysis (NPR style)
- **News Integration**: The Hill RSS feeds blend breaking news with bill tracking (Marketplace-style)
- **Interactive Dashboard**: Bill tracking, rep profiles, voting records, personalized news feeds
- **Action Tools**: Direct contact with representatives
- **Transparent**: Uses actual Congressional Record speeches

### 1.4 Unique Value Propositions

1. **Dual Podcast Format**: Quick daily updates + deep weekly analysis
2. **News-Driven Context**: The Hill RSS integration provides current events context (Marketplace model)
3. **Authenticity**: Uses actual Congressional Record speeches
4. **Personalization**: Your representatives, your issues, your community, your news feeds
5. **Professional Quality**: NPR-style production with dual hosts
6. **Launch-Ready**: Full authentication, payment processing, scalable infrastructure

### 1.5 Hackathon Innovation

- Built entirely using **Claude Code** on **Raindrop Platform**
- **SQL (SQLite)** for reliable data management with programmatic schema initialization
- **Algolia Search** for lightning-fast bill search (<20ms) with progressive caching
- **Raindrop SmartBuckets** for document RAG capabilities
- **Vultr Object Storage + CDN** for low-latency audio delivery
- **ElevenLabs text-to-dialogue** for professional voice generation
- **Production-ready** with Stripe payments and WorkOS authentication

---

## 2. HACKATHON REQUIREMENTS COMPLIANCE

### 2.1 Core Requirements Checklist

✅ **Working AI application built on Raindrop Platform**

- Backend deployed on Raindrop
- Uses Raindrop MCP Server for all data operations
- Integrates Raindrop SQL (SQLite), SmartBuckets, SmartMemory

✅ **Must use AI coding assistant**

- **Primary**: Claude Code (via Raindrop MCP)
- All code generation logged and documented

✅ **Must integrate at least one Vultr service**

- **Vultr Object Storage**: Audio file storage with S3-compatible API
- **Vultr CDN**: Global content delivery for audio files
- Low-latency audio streaming

✅ **Projects newly created during hackathon**

- Greenfield project, all code written during event
- Git history shows progressive development
- Commit timestamps within hackathon window

✅ **Voice Agent Category: Must integrate ElevenLabs**

- Dual-voice system (Sarah + James)
- Professional NPR-quality audio
- Daily + weekly podcast generation
- Uses ElevenLabs `/v1/text-to-dialogue` endpoint (single call for full conversation)

✅ **Utilize Raindrop Smart Components**

- **SQL (SQLite)**: Direct SQL database operations with prepared statements
- **SmartBuckets**: RAG-enabled document storage with semantic search
- **SmartMemory**: Multi-layer memory system (working, episodic, semantic, procedural)
- **AI Models**: Direct access via `env.AI.run()` for Claude and other models

✅ **Deploy backend services on Raindrop**

- All API routes on Raindrop
- Database on Raindrop SQL (SQLite)
- Document storage on Raindrop SmartBuckets
- Audio storage on Vultr Object Storage
- Search index on Algolia for fast bill lookups

✅ **Enhance with Vultr service**

- Vultr Object Storage + CDN for audio delivery
- S3-compatible API for seamless integration
- Global edge caching for low-latency playback

✅ **Application functions consistently**

- Comprehensive error handling
- Demo video shows full user flow
- Graceful degradation patterns

✅ **Launch-ready quality**

- **Authentication**: WorkOS + OAuth (Google, Twitter)
- **Payments**: Stripe integration (Freemium model)
- **Security**: Rate limiting, input validation with Zod
- **Monitoring**: Error tracking with structured logging
- **Performance**: <2s page loads, <60s podcast generation

### 2.2 Raindrop Platform Integration (CORRECTED)

**CRITICAL: Uses Standard SQL with Prepared Statements**

```typescript
// CORRECT: Using standard SQL via Raindrop's database binding
// Access via env.CIVIC_DB in Raindrop service

// SQL (SQLite) - Direct queries with prepared statements
const bills = await env.CIVIC_DB.prepare(`
  SELECT * FROM bills
  WHERE has_full_text = 1
  AND impact_score >= ?
  ORDER BY latest_action_date DESC
  LIMIT ?
`).bind(60, 10).all();

// SmartBuckets - RAG-enabled document search (via MCP)
const relevantDocs = await mcp.buckets.search({
  bucket_name: 'congressional-documents',
  query: 'healthcare reform provisions',
  limit: 5,
  threshold: 0.7
});

// SmartMemory - Working memory for user sessions (via MCP)
await mcp.memory.putMemory({
  session_id: userId,
  content: JSON.stringify({ preferences: userInterests }),
  key: 'user-preferences',
  timeline: 'current-session'
});

// AI Models - Direct access (no wrapper)
const analysis = await env.AI.run('claude-sonnet-4-20250514', {
  messages: [{
    role: 'user',
    content: `Analyze this bill: ${billText}`
  }],
  max_tokens: 4000
});
```

### 2.3 Vultr Integration Architecture (CORRECTED)

**SIMPLIFIED: Vultr is ONLY for Object Storage + CDN**

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT LAYER                           │
│              (Next.js 16 Frontend)                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              RAINDROP PLATFORM                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Next.js 16 API Routes                    │   │
│  │  (Serverless Functions on Raindrop)             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │      Raindrop Components                        │   │
│  │  • SQL Database (SQLite via env.CIVIC_DB)       │   │
│  │  • SmartBuckets (Document RAG)                  │   │
│  │  • SmartMemory (Session Management)             │   │
│  │  • AI Models (via env.AI.run())                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│         VULTR OBJECT STORAGE + CDN                       │
│  (Audio Files ONLY - S3-Compatible API)                 │
│                                                          │
│  • MP3 podcast files                                    │
│  • Global CDN distribution                              │
│  • Low-latency audio delivery                           │
│  • 99.99% uptime SLA                                    │
└─────────────────────────────────────────────────────────┘
                         ↑
┌─────────────────────────────────────────────────────────┐
│                 EXTERNAL SERVICES                        │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │
│  │Congress.gov │ │  Anthropic  │ │   ElevenLabs     │   │
│  │     API     │ │Claude Sonnet│ │ text-to-dialogue │   │
│  └─────────────┘ └─────────────┘ └──────────────────┘   │
│  ┌─────────────┐ ┌─────────────┐                        │
│  │   WorkOS    │ │   Stripe    │                        │
│  │    Auth     │ │  Payments   │                        │
│  └─────────────┘ └─────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

---

## 3. PRODUCT VISION

### 3.1 Mission Statement

"To create an informed citizenry by making Congressional activity accessible, understandable, and actionable for every American through intelligent voice technology."

### 3.2 Product Principles

1. **Audio First**: Voice is the most accessible format
2. **Daily Cadence**: Meet users where they are (morning commute)
3. **Trust Through Transparency**: Multiple perspectives, source citations
4. **Respect User Time**: 5 min daily or 15 min weekly
5. **Action-Oriented**: Don't just inform, enable engagement

### 3.3 Success Vision

**3 Months Post-Launch:**

- 10,000+ active users across 50 states
- 500,000+ podcast downloads
- 5,000+ direct contacts made to representatives
- Featured in civic tech publications

**1 Year Post-Launch:**

- 100,000+ active users
- Partnership with public radio stations
- Mobile apps (iOS/Android)
- Integration with voting registration systems

---

## 4. TECHNICAL ARCHITECTURE

### 4.1 Tech Stack (CORRECTED)

**Frontend:**

- **Framework**: Next.js 16 (App Router with Turbopack)
- **UI Library**: React 19
- **Component Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS v4
- **State Management**: React Context + Zustand
- **Audio Player**: React Player + Howler.js
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation

**Backend & Infrastructure:**

- **Platform**: Raindrop (Serverless)
  - SQL (SQLite with prepared statements via env.CIVIC_DB)
  - SmartBuckets (RAG-enabled document storage)
  - SmartMemory (Multi-layer memory system)
  - AI Models (Direct access via env.AI.run())

- **Search & Performance**: Algolia
  - Fast bill search (<20ms response time)
  - Progressive caching from Congress.gov API
  - Dual-database architecture (SQL as source of truth)

- **Storage & CDN**: Vultr Object Storage
  - S3-compatible API
  - Audio file delivery (MP3 podcasts)
  - Global CDN distribution

**AI Services:**

- **Text Analysis**: Claude Sonnet 4 (via env.AI.run() on Raindrop)
- **Voice Generation**: ElevenLabs `/v1/text-to-dialogue` API
- **Model Access**: Direct via Raindrop's env.AI.run() (no wrapper)

**External APIs:**

- **Congress.gov API**: Legislative data (bills and members)
- **Geocodio API**: Congressional district lookup and representative data (faster alternative to Congress.gov for member lookups)
- **WorkOS**: Authentication (OAuth with Google, Twitter)
- **Stripe API**: Payment processing

**DevOps:**

- **Hosting**: Raindrop Platform (serverless)
- **CI/CD**: GitHub Actions
- **Monitoring**: Structured logging + error tracking
- **Security**: Zod validation, rate limiting

### 4.2 Next.js 16 Features Utilized

```javascript
// next.config.ts (Next.js 16)
import type { NextConfig } from 'next';

const config: NextConfig = {
  // Turbopack (stable in Next.js 16)
  turbopack: true,

  // React 19 compiler
  experimental: {
    reactCompiler: true,
  },

  // Partial Prerendering
  experimental: {
    ppr: true,
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vultr-cdn.civicpulse.com', // Vultr CDN
      },
    ],
  },
};

export default config;
```

---

## 5. DATABASE SCHEMA (SQL - SQLite)

**CORRECTED: SQLite-compatible schema with programmatic initialization**

### 5.1 Core Tables

```sql
-- ============================================================================
-- USERS TABLE (SQLite)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- UUID as TEXT in SQLite
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,

  -- Authentication (WorkOS)
  auth_provider TEXT DEFAULT 'email', -- 'email', 'google', 'twitter'
  auth_provider_id TEXT,
  email_verified INTEGER DEFAULT 0, -- BOOLEAN as INTEGER in SQLite

  -- Location
  zip_code TEXT NOT NULL,
  congressional_district TEXT,
  state TEXT,
  city TEXT,

  -- Preferences
  interests TEXT NOT NULL, -- JSON array stored as TEXT
  podcast_frequency TEXT DEFAULT 'both', -- 'daily', 'weekly', 'both', 'ondemand'
  daily_time TEXT DEFAULT '07:00:00', -- TIME as TEXT in SQLite
  podcast_length_preference TEXT DEFAULT 'standard',
  delivery_day TEXT DEFAULT 'friday',

  -- Notifications
  notifications_enabled INTEGER DEFAULT 1,
  email_notifications INTEGER DEFAULT 1,
  push_notifications INTEGER DEFAULT 0,

  -- Subscription (Stripe)
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'premium'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_expires_at TEXT, -- DATETIME as TEXT (ISO 8601)

  -- Engagement
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login TEXT,
  streak_days INTEGER DEFAULT 0,
  total_episodes_listened INTEGER DEFAULT 0,
  total_actions_taken INTEGER DEFAULT 0,

  -- Validation
  CHECK (email LIKE '%@%.%')
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_zip ON users(zip_code);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_tier, subscription_expires_at);

-- ============================================================================
-- REPRESENTATIVES TABLE (SQLite)
-- ============================================================================
CREATE TABLE IF NOT EXISTS representatives (
  id TEXT PRIMARY KEY,
  bioguide_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  party TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT, -- NULL for senators
  chamber TEXT NOT NULL, -- 'house', 'senate'
  title TEXT,

  -- Contact
  photo_url TEXT,
  office_address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  twitter_handle TEXT,

  -- Details
  committees TEXT, -- JSON array as TEXT
  term_start TEXT, -- DATE as TEXT
  term_end TEXT,
  is_active INTEGER DEFAULT 1,

  -- Caching (7 day TTL from lib/api/claude.md)
  cache_expires_at TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reps_bioguide ON representatives(bioguide_id);
CREATE INDEX IF NOT EXISTS idx_reps_state_district ON representatives(state, district);
CREATE INDEX IF NOT EXISTS idx_reps_active ON representatives(is_active) WHERE is_active = 1;

-- ============================================================================
-- BILLS TABLE (SQLite)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  congress INTEGER NOT NULL,
  bill_type TEXT NOT NULL,
  bill_number INTEGER NOT NULL,
  full_bill_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  official_title TEXT,

  -- Dates
  introduced_date TEXT,
  latest_action_date TEXT,
  latest_action_text TEXT,

  -- Sponsor
  sponsor_bioguide_id TEXT REFERENCES representatives(bioguide_id),
  sponsor_name TEXT,
  sponsor_party TEXT,
  sponsor_state TEXT,

  -- Status
  status TEXT,
  is_enacted INTEGER DEFAULT 0,

  -- Content
  has_full_text INTEGER DEFAULT 0,
  full_text_url TEXT,
  summary_short TEXT,
  summary_detailed TEXT,

  -- AI Analysis (Claude via env.AI.run())
  plain_english_summary TEXT,
  key_provisions TEXT, -- JSON as TEXT
  affected_groups TEXT, -- JSON as TEXT
  issue_categories TEXT, -- JSON array as TEXT
  complexity_score INTEGER CHECK (complexity_score BETWEEN 1 AND 10),
  controversy_level TEXT CHECK (controversy_level IN ('high', 'medium', 'low')),
  estimated_cost TEXT,
  title_accuracy_check TEXT,
  local_impact TEXT, -- JSON as TEXT
  ai_analysis_version INTEGER DEFAULT 1,

  -- Metrics
  cosponsor_count INTEGER DEFAULT 0,
  is_bipartisan INTEGER DEFAULT 0,
  impact_score REAL CHECK (impact_score BETWEEN 0 AND 100),

  -- Congressional Record
  has_floor_speeches INTEGER DEFAULT 0,
  floor_speech_count INTEGER DEFAULT 0,

  -- Caching (24 hour TTL from lib/api/claude.md)
  cache_expires_at TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(congress, bill_type, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_bills_full_id ON bills(full_bill_id);
CREATE INDEX IF NOT EXISTS idx_bills_impact ON bills(impact_score DESC) WHERE has_full_text = 1;
CREATE INDEX IF NOT EXISTS idx_bills_latest_action ON bills(latest_action_date DESC);

-- ============================================================================
-- PODCAST EPISODES TABLE (SQLite)
-- ============================================================================
CREATE TABLE IF NOT EXISTS podcast_episodes (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,

  -- Episode info
  episode_type TEXT NOT NULL CHECK (episode_type IN ('daily', 'weekly')),
  title TEXT NOT NULL,
  description TEXT,
  episode_date TEXT NOT NULL, -- DATE as TEXT
  duration INTEGER, -- seconds

  -- Audio (Vultr CDN)
  audio_url TEXT NOT NULL, -- Vultr CDN URL
  audio_size_bytes INTEGER,
  transcript TEXT,

  -- Content references (JSON arrays as TEXT)
  featured_bills TEXT NOT NULL, -- JSON array of bill IDs
  featured_representatives TEXT NOT NULL, -- JSON array of rep IDs

  -- Script (stored for debugging, JSON as TEXT)
  script_json TEXT,

  -- Generation metadata
  generation_status TEXT DEFAULT 'pending' CHECK (
    generation_status IN ('pending', 'processing', 'completed', 'failed')
  ),
  generation_started_at TEXT,
  generation_completed_at TEXT,
  generation_duration_seconds INTEGER,
  error_message TEXT,

  -- AI models used
  claude_model TEXT DEFAULT 'claude-sonnet-4-20250514',
  elevenlabs_model TEXT DEFAULT 'eleven_monolingual_v1',
  total_ai_cost_cents INTEGER,

  -- Engagement
  listen_count INTEGER DEFAULT 0,
  completion_rate REAL CHECK (completion_rate BETWEEN 0 AND 1),
  share_count INTEGER DEFAULT 0,

  created_at TEXT DEFAULT (datetime('now')),

  UNIQUE(user_id, episode_date, episode_type)
);

CREATE INDEX IF NOT EXISTS idx_episodes_user_type ON podcast_episodes(user_id, episode_type);
CREATE INDEX IF NOT EXISTS idx_episodes_date ON podcast_episodes(episode_date DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON podcast_episodes(generation_status)
  WHERE generation_status IN ('pending', 'processing');

-- ============================================================================
-- LISTENING HISTORY TABLE (SQLite)
-- ============================================================================
CREATE TABLE IF NOT EXISTS listening_history (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  episode_id TEXT REFERENCES podcast_episodes(id) ON DELETE CASCADE,

  -- Listening data
  started_at TEXT DEFAULT (datetime('now')),
  last_position INTEGER DEFAULT 0, -- seconds
  completed INTEGER DEFAULT 0,
  completed_at TEXT,

  -- Device info
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  browser TEXT,

  UNIQUE(user_id, episode_id)
);

CREATE INDEX IF NOT EXISTS idx_history_user ON listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_completed ON listening_history(completed, completed_at DESC);

-- ============================================================================
-- SYSTEM CONFIG TABLE (SQLite)
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON as TEXT
  description TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert default configs
INSERT OR REPLACE INTO system_config (key, value, description) VALUES
('interest_categories', '["Healthcare", "Housing", "Climate", "Education", "Economy", "Immigration", "Defense", "Technology", "Justice", "Agriculture", "Veterans", "Trade"]', 'Available interest categories'),
('podcast_daily_length', '{"target_minutes": 6, "max_minutes": 8}', 'Daily podcast length targets'),
('podcast_weekly_length', '{"target_minutes": 16, "max_minutes": 20}', 'Weekly podcast length targets');
```

### 5.2 SQL Usage with Prepared Statements (CORRECTED)

```ts
// src/web/index.ts (Raindrop service)

interface Env {
  CIVIC_DB: SqlDatabase;
  AI: any;
}

// Execute SQL query with prepared statements
export async function getBills(
  env: Env,
  params: {
    hasFullText?: boolean;
    minImpactScore?: number;
    limit?: number;
  }
) {
  const result = await env.CIVIC_DB.prepare(`
    SELECT * FROM bills
    WHERE has_full_text = ?
    AND impact_score >= ?
    ORDER BY latest_action_date DESC
    LIMIT ?
  `)
    .bind(
      params.hasFullText ? 1 : 0,
      params.minImpactScore || 0,
      params.limit || 10
    )
    .all();

  return result.results;
}

// Insert or update bill
export async function upsertBill(env: Env, bill: Bill) {
  return await env.CIVIC_DB.prepare(`
    INSERT OR REPLACE INTO bills (
      id, congress, bill_type, bill_number, full_bill_id,
      title, introduced_date, latest_action_date, sponsor_bioguide_id,
      has_full_text, plain_english_summary, issue_categories, impact_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      bill.id,
      bill.congress,
      bill.bill_type,
      bill.bill_number,
      bill.full_bill_id,
      bill.title,
      bill.introduced_date,
      bill.latest_action_date,
      bill.sponsor_bioguide_id,
      bill.has_full_text ? 1 : 0,
      bill.plain_english_summary,
      JSON.stringify(bill.issue_categories),
      bill.impact_score
    )
    .run();
}

// Get database metadata
export async function getTableInfo(env: Env, tableName: string) {
  const result = await env.CIVIC_DB.prepare(`
    PRAGMA table_info(${tableName})
  `).all();

  return result.results;
}
```

---

## 6. SEARCH ARCHITECTURE (ALGOLIA + SQL)

**Dual-Database Pattern: Fast Search with Progressive Caching**

### 6.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   USER SEARCH FLOW                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              ALGOLIA SEARCH INDEX                        │
│  • Lightning-fast search (<20ms)                        │
│  • Truncated bill data for quick preview                │
│  • Faceted filtering by category, status, date          │
│  • Typo-tolerance and relevance ranking                 │
└─────────────────────────────────────────────────────────┘
                         ↓
                    ┌─────────┐
                    │  Found? │
                    └─────────┘
                    /           \
                 YES             NO
                  ↓               ↓
┌──────────────────────┐   ┌──────────────────────────┐
│  RAINDROP SQL DB     │   │  CONGRESS.GOV API        │
│  • Full bill data    │   │  • Fetch missing bill    │
│  • Complete text     │   │  • ~800ms response       │
│  • Analysis results  │   │                          │
│  • Source of truth   │   │          ↓               │
└──────────────────────┘   │  Save to SQL Database    │
                            │          ↓               │
                            │  Sync to Algolia Index   │
                            │          ↓               │
                            │  Return to User          │
                            └──────────────────────────┘
```

### 6.2 Progressive Caching Workflow

**Search Request Flow:**

1. **User searches for "healthcare reform"**
2. **Query Algolia** (<20ms response):
   - If found → Return results immediately
   - If not found → Continue to step 3

3. **Fetch from Congress.gov API** (~800ms):
   - Search Congress.gov for matching bills
   - Parse and enrich with metadata

4. **Store in SQL Database**:
   - Save complete bill data
   - Run AI analysis (Claude Sonnet 4)
   - Store full text, summary, categories

5. **Sync to Algolia**:
   - Push truncated data to search index
   - Enable fast future searches
   - Update relevance rankings

6. **Return Results to User**:
   - Full bill details from SQL database
   - Future searches benefit from cache

### 6.3 Data Synchronization Strategy

**Algolia Index Schema (Truncated for Fast Search):**

```typescript
// Algolia record (lightweight, optimized for search)
interface AlgoliaBillRecord {
  objectID: string;           // bill.full_bill_id (e.g., "hr100-118")
  congress: number;           // 118
  bill_type: string;          // "hr"
  bill_number: number;        // 100
  title: string;              // Full title for search
  summary_short: string;      // 200 char summary
  issue_categories: string[]; // ["Healthcare", "Economy"]
  sponsor_name: string;       // "Rep. Nancy Pelosi"
  sponsor_party: string;      // "D"
  sponsor_state: string;      // "CA"
  introduced_date: number;    // Unix timestamp for sorting
  latest_action_date: number; // Unix timestamp
  status: string;             // "Passed House"
  impact_score: number;       // 85 (0-100)
  is_enacted: boolean;        // false
  _tags: string[];            // For faceted filtering
}
```

**SQL Database (Complete, Source of Truth):**

- Full bill text (can be 30+ pages)
- Claude AI analysis results
- Congressional Record speeches
- Voting records
- Full sponsor/cosponsor details
- All metadata and timestamps

### 6.4 Implementation

**Search API Route:**

```typescript
// app/api/search-congress/route.ts

import algoliasearch from 'algoliasearch';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const algoliaClient = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_API_KEY!
);
const billsIndex = algoliaClient.initIndex('bills');

const searchSchema = z.object({
  query: z.string().min(1).max(200),
  filters: z.object({
    categories: z.array(z.string()).optional(),
    congress: z.number().optional(),
    status: z.string().optional()
  }).optional(),
  page: z.number().default(0),
  hitsPerPage: z.number().default(20)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, filters, page, hitsPerPage } = searchSchema.parse(body);

    // 1. Search Algolia first (fast!)
    const algoliaResults = await billsIndex.search(query, {
      filters: buildAlgoliaFilters(filters),
      page,
      hitsPerPage,
      attributesToRetrieve: [
        'objectID', 'title', 'summary_short', 'issue_categories',
        'sponsor_name', 'latest_action_date', 'impact_score'
      ]
    });

    if (algoliaResults.hits.length > 0) {
      // Found in Algolia - return immediately
      return NextResponse.json({
        hits: algoliaResults.hits,
        nbHits: algoliaResults.nbHits,
        page: algoliaResults.page,
        source: 'cache' // Indicate cache hit
      });
    }

    // 2. Not found - fetch from Congress.gov API
    console.log('Cache miss - fetching from Congress.gov');
    const congressResults = await fetchFromCongressGov(query, filters);

    if (congressResults.length === 0) {
      return NextResponse.json({
        hits: [],
        nbHits: 0,
        page: 0,
        source: 'api'
      });
    }

    // 3. Store in SQL database (parallel operations)
    await Promise.all(
      congressResults.map(bill => storeBillInDatabase(bill))
    );

    // 4. Sync to Algolia (async, don't block response)
    syncToAlgolia(congressResults).catch(err =>
      console.error('Algolia sync failed:', err)
    );

    // 5. Return results
    return NextResponse.json({
      hits: congressResults.map(formatBillForResponse),
      nbHits: congressResults.length,
      page: 0,
      source: 'api' // Indicate fresh fetch
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

// Store bill in SQL database
async function storeBillInDatabase(bill: CongressBill) {
  return await env.CIVIC_DB.prepare(`
    INSERT OR REPLACE INTO bills (
      id, full_bill_id, congress, bill_type, bill_number,
      title, summary_short, issue_categories, sponsor_name,
      introduced_date, latest_action_date, status, impact_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      bill.id,
      bill.full_bill_id,
      bill.congress,
      bill.bill_type,
      bill.bill_number,
      bill.title,
      bill.summary_short,
      JSON.stringify(bill.issue_categories),
      bill.sponsor_name,
      bill.introduced_date,
      bill.latest_action_date,
      bill.status,
      bill.impact_score || 50
    )
    .run();
}

// Sync bills to Algolia
async function syncToAlgolia(bills: CongressBill[]) {
  const algoliaRecords = bills.map(bill => ({
    objectID: bill.full_bill_id,
    congress: bill.congress,
    bill_type: bill.bill_type,
    bill_number: bill.bill_number,
    title: bill.title,
    summary_short: bill.summary_short?.substring(0, 200),
    issue_categories: bill.issue_categories || [],
    sponsor_name: bill.sponsor_name,
    sponsor_party: bill.sponsor_party,
    sponsor_state: bill.sponsor_state,
    introduced_date: new Date(bill.introduced_date).getTime(),
    latest_action_date: new Date(bill.latest_action_date).getTime(),
    status: bill.status,
    impact_score: bill.impact_score || 50,
    is_enacted: bill.is_enacted || false,
    _tags: bill.issue_categories || []
  }));

  await billsIndex.saveObjects(algoliaRecords);
}
```

### 6.5 Performance Characteristics

| Operation | Response Time | Data Source |
|-----------|---------------|-------------|
| **Algolia Search** (cache hit) | <20ms | Algolia Index |
| **SQL Query** (full bill data) | ~50ms | Raindrop SQL |
| **Congress.gov API** (miss) | ~800ms | External API |
| **Total (worst case)** | ~900ms | API + SQL + Algolia |

**Benefits:**
- **Fast searches**: 95%+ queries served from Algolia cache (<20ms)
- **Always current**: SQL database is source of truth, auto-syncs to Algolia
- **Progressive enhancement**: Cache builds as users search
- **Resilient**: Falls back to Congress.gov if Algolia is down

### 6.6 Algolia Configuration

**Index Settings:**

```typescript
// scripts/configure-algolia.ts

await billsIndex.setSettings({
  searchableAttributes: [
    'title',
    'summary_short',
    'sponsor_name',
    'unordered(issue_categories)'
  ],
  attributesForFaceting: [
    'searchable(issue_categories)',
    'congress',
    'sponsor_party',
    'sponsor_state',
    'status',
    'is_enacted'
  ],
  customRanking: [
    'desc(impact_score)',
    'desc(latest_action_date)'
  ],
  ranking: [
    'typo',
    'geo',
    'words',
    'filters',
    'proximity',
    'attribute',
    'exact',
    'custom'
  ],
  typoTolerance: true,
  minWordSizefor1Typo: 4,
  minWordSizefor2Typos: 8
});
```

---

## 7. API INTEGRATIONS

**CORRECTED: Using actual implementation patterns from nested claude.md files**

### 7.1 Congress.gov API (from lib/api/claude.md)

```ts
// lib/api/congress.ts

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY!;
const BASE_URL = 'https://api.congress.gov/v3';

// Rate limit: 1 request per second
const RATE_LIMIT_MS = 1000;
let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(resolve =>
      setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

// Cache interface (using Raindrop SmartMemory)
import { mcp } from '@raindrop/mcp';

async function getCached(key: string) {
  const result = await mcp.memory.getMemory({
    session_id: 'api-cache',
    key
  });
  return result.length > 0 ? JSON.parse(result[0].content) : null;
}

async function setCache(key: string, data: any, ttl: number) {
  await mcp.memory.putMemory({
    session_id: 'api-cache',
    content: JSON.stringify(data),
    key
  });
}

// Fetch bills (24 hour cache from lib/api/claude.md)
export async function fetchBills(params: {
  congress: number;
  type?: 'hr' | 's' | 'hjres' | 'sjres';
  limit?: number;
  offset?: number;
}) {
  const cacheKey = `bills:${params.congress}:${params.type}:${params.offset}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  await rateLimit();

  const url = new URL(`${BASE_URL}/bill/${params.congress}`);
  url.searchParams.append('api_key', CONGRESS_API_KEY);
  url.searchParams.append('limit', String(params.limit || 20));
  if (params.type) url.searchParams.append('type', params.type);
  if (params.offset) url.searchParams.append('offset', String(params.offset));

  const response = await fetch(url.toString(), {
    next: { revalidate: 86400 } // 24 hour cache
  });

  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status}`);
  }

  const data = await response.json();
  await setCache(cacheKey, data, 86400);

  return data;
}

// Fetch members (7 day cache from lib/api/claude.md)
export async function fetchMembers(params: {
  state?: string;
  district?: number;
  currentMember?: boolean;
  limit?: number;
}) {
  const cacheKey = `members:${params.state}:${params.district}:${params.currentMember}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  await rateLimit();

  const url = new URL(`${BASE_URL}/member`);
  url.searchParams.append('api_key', CONGRESS_API_KEY);
  url.searchParams.append('limit', String(params.limit || 20));

  if (params.state) url.searchParams.append('state', params.state);
  if (params.district) url.searchParams.append('district', String(params.district));
  if (params.currentMember !== undefined) {
    url.searchParams.append('currentMember', String(params.currentMember));
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: 604800 } // 7 day cache
  });

  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status}`);
  }

  const data = await response.json();
  await setCache(cacheKey, data, 604800);

  return data;
}
```

### 7.2 Claude Sonnet 4 API (CORRECTED: via env.AI.run())

```ts
// lib/ai/claude.ts

// CORRECT: Direct access via Raindrop's env.AI.run()
export async function analyzeBill(billText: string, billMetadata: BillMetadata) {
  const prompt = `
You are a legislative analyst. Analyze this congressional bill comprehensively.

BILL: ${billMetadata.number} - ${billMetadata.title}
FULL TEXT:
${billText}

Provide analysis in JSON format:
{
  "plain_english_summary": "2-3 sentences",
  "key_provisions": ["provision 1", "provision 2", ...],
  "affected_groups": [
    {"group": "name", "impact": "positive/negative/mixed", "description": "..."}
  ],
  "issue_categories": ["Healthcare", "Economy", ...],
  "complexity_score": 1-10,
  "controversy_level": "high/medium/low"
}
`;

  const result = await env.AI.run('claude-sonnet-4-20250514', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4000
  });

  return JSON.parse(result.content[0].text);
}

export async function generateDialogueScript(
  bills: Bill[],
  representatives: Representative[],
  type: 'daily' | 'weekly'
) {
  const prompt = `Create a podcast dialogue between Sarah and James about these bills.

Format: Return a JSON array of dialogue entries:
[
  { "host": "sarah", "text": "..." },
  { "host": "james", "text": "..." }
]

Guidelines:
- Sarah introduces topics, James adds context
- Use contractions for natural flow
- Include acknowledgments ("That's right", "Exactly")
- Plain language, no jargon
- ${type === 'daily' ? '2 minutes per bill' : '15-18 minutes total'}

Bills: ${JSON.stringify(bills)}
Representatives: ${representatives.map(r => r.name).join(', ')}`;

  const result = await env.AI.run('claude-sonnet-4-20250514', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: type === 'daily' ? 2000 : 5000
  });

  return JSON.parse(result.content[0].text);
}
```

### 7.3 ElevenLabs API (from lib/ai/claude.md)

**CRITICAL: Uses `/v1/text-to-dialogue` endpoint for complete multi-host conversation**

```ts
// lib/ai/elevenlabs.ts

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const SARAH_VOICE_ID = process.env.ELEVENLABS_SARAH_VOICE_ID!;
const JAMES_VOICE_ID = process.env.ELEVENLABS_JAMES_VOICE_ID!;

interface DialogueEntry {
  host: 'sarah' | 'james';
  text: string;
}

// CRITICAL: Single API call generates complete dialogue audio
export async function generateDialogue(dialogue: DialogueEntry[]): Promise<Buffer> {
  const inputs = dialogue.map(entry => ({
    text: entry.text,
    voice_id: entry.host === 'sarah' ? SARAH_VOICE_ID : JAMES_VOICE_ID
  }));

  const response = await fetch(
    'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_192',
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        inputs,
        model_id: 'eleven_monolingual_v1',
        settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}
```

### 7.4 WorkOS Authentication (CORRECTED)

**CRITICAL: Uses WorkOS, not "Raindrop Auth"**

```ts
// lib/auth/workos.ts

import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);
const clientId = process.env.WORKOS_CLIENT_ID!;

export async function getAuthorizationUrl(provider: 'google' | 'twitter') {
  const authorizationUrl = workos.sso.getAuthorizationUrl({
    clientId,
    provider,
    redirectUri: process.env.WORKOS_REDIRECT_URI!,
  });

  return authorizationUrl;
}

export async function authenticateWithCode(code: string) {
  const { profile } = await workos.sso.getProfileAndToken({
    code,
    clientId,
  });

  return profile;
}
```

### 7.5 Geocodio API (Congressional District & Representative Lookup)

**Purpose:** Fast, accurate lookup of congressional districts and representatives from zip codes or addresses. Returns complete legislator data including photos, contact info, and social media in a single API call.

**Why Geocodio Instead of Congress.gov for Representatives:**
- **Speed**: ~200ms vs ~800ms for Congress.gov
- **Complete Data**: Photos, social media, contact forms in one response
- **Accurate**: Uses official @unitedstates project data
- **Better UX**: Instant representative lookup during onboarding

```ts
// lib/api/geocodio.ts

interface GeocodioConfig {
  apiKey: string;
  baseUrl: string;
}

interface CongressionalDistrictData {
  name: string;
  district_number: number;
  ocd_id: string;
  congress_number: string;
  congress_years: string;
  proportion: number;
  current_legislators: Legislator[];
}

interface Legislator {
  type: 'representative' | 'senator';
  seniority: 'senior' | 'junior' | null;
  bio: {
    last_name: string;
    first_name: string;
    birthday: string;
    gender: string;
    party: string;
    photo_url: string;
    photo_attribution: string;
  };
  contact: {
    url: string;
    address: string;
    phone: string;
    contact_form: string | null;
  };
  social: {
    rss_url: string | null;
    twitter: string | null;
    facebook: string | null;
    youtube: string | null;
    youtube_id: string | null;
  };
  references: {
    bioguide_id: string;
    thomas_id: string;
    opensecrets_id: string;
    lis_id: string | null;
    cspan_id: string;
    govtrack_id: string;
    votesmart_id: string;
    ballotpedia_id: string;
    wikipedia_id: string;
  };
}

const GEOCODIO_API_KEY = process.env.GEOCODIO_API_KEY!;
const BASE_URL = 'https://api.geocod.io/v1.7';

/**
 * Look up congressional district and representatives by zip code
 * Returns 1 House Rep + 2 Senators with complete contact/social data
 */
export async function getRepresentativesByZip(
  zipCode: string
): Promise<CongressionalDistrictData[]> {
  const url = `${BASE_URL}/geocode?postal_code=${zipCode}&fields=cd119&api_key=${GEOCODIO_API_KEY}`;

  const response = await fetch(url, {
    next: { revalidate: 604800 } // Cache for 7 days (reps don't change often)
  });

  if (!response.ok) {
    throw new Error(`Geocodio API error: ${response.status}`);
  }

  const data = await response.json();

  // Geocodio returns array of possible results, sorted by accuracy
  const bestResult = data.results[0];

  if (!bestResult?.fields?.congressional_districts) {
    throw new Error('No congressional district found for zip code');
  }

  return bestResult.fields.congressional_districts;
}

/**
 * Look up congressional district and representatives by full address
 * More accurate than zip code alone
 */
export async function getRepresentativesByAddress(
  address: string
): Promise<CongressionalDistrictData[]> {
  const encodedAddress = encodeURIComponent(address);
  const url = `${BASE_URL}/geocode?q=${encodedAddress}&fields=cd119&api_key=${GEOCODIO_API_KEY}`;

  const response = await fetch(url, {
    next: { revalidate: 604800 }
  });

  if (!response.ok) {
    throw new Error(`Geocodio API error: ${response.status}`);
  }

  const data = await response.json();
  const bestResult = data.results[0];

  if (!bestResult?.fields?.congressional_districts) {
    throw new Error('No congressional district found for address');
  }

  return bestResult.fields.congressional_districts;
}

/**
 * Save legislators from Geocodio to our database
 * Maps Geocodio format to our schema
 */
export async function saveLegislatorsToDatabase(
  legislators: Legislator[],
  env: Env
): Promise<string[]> {
  const savedIds: string[] = [];

  for (const legislator of legislators) {
    const id = generateUUID();

    await env.CIVIC_DB.prepare(`
      INSERT OR REPLACE INTO representatives (
        id, bioguide_id, name, party, state, district, chamber,
        image_url, office_address, phone, website_url,
        twitter_handle, committees
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        id,
        legislator.references.bioguide_id,
        `${legislator.bio.first_name} ${legislator.bio.last_name}`,
        legislator.bio.party,
        extractStateFromAddress(legislator.contact.address),
        legislator.type === 'representative' ? extractDistrictFromName(legislator.name) : null,
        legislator.type === 'representative' ? 'house' : 'senate',
        legislator.bio.photo_url,
        legislator.contact.address,
        legislator.contact.phone,
        legislator.contact.url,
        legislator.social.twitter,
        JSON.stringify([]) // Committees would need separate API call
      )
      .run();

    savedIds.push(id);
  }

  return savedIds;
}
```

**Use Case: Onboarding Flow**

```typescript
// app/api/onboarding/route.ts

import { getRepresentativesByZip, saveLegislatorsToDatabase } from '@/lib/api/geocodio';

export async function POST(req: Request) {
  const { userId, zipCode, interests } = await req.json();

  // 1. Look up representatives via Geocodio (fast!)
  const districtData = await getRepresentativesByZip(zipCode);
  const primaryDistrict = districtData[0]; // Highest proportion/accuracy

  // 2. Extract legislators (1 rep + 2 senators)
  const legislators = primaryDistrict.current_legislators;

  // 3. Save legislators to database (if not already there)
  const repIds = await saveLegislatorsToDatabase(legislators, env);

  // 4. Update user profile with their district and representatives
  await env.CIVIC_DB.prepare(`
    UPDATE users
    SET
      zip_code = ?,
      congressional_district = ?,
      state = ?,
      interests = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
    .bind(
      zipCode,
      primaryDistrict.name,
      extractStateFromDistrict(primaryDistrict.name),
      JSON.stringify(interests),
      userId
    )
    .run();

  // 5. Link user to their representatives
  for (const repId of repIds) {
    await env.CIVIC_DB.prepare(`
      INSERT OR IGNORE INTO user_representatives (user_id, representative_id)
      VALUES (?, ?)
    `)
      .bind(userId, repId)
      .run();
  }

  return NextResponse.json({
    success: true,
    district: primaryDistrict.name,
    representatives: legislators.map(leg => ({
      name: `${leg.bio.first_name} ${leg.bio.last_name}`,
      party: leg.bio.party,
      type: leg.type,
      photo: leg.bio.photo_url
    }))
  });
}
```

**Personalization Benefits:**

1. **Instant Onboarding**: User sees their reps immediately after entering zip
2. **Personalized Podcasts**: "Your representative Nancy Pelosi voted yes on HR 1234"
3. **Targeted Alerts**: "Bill affecting your district up for vote tomorrow"
4. **Action Templates**: Pre-filled contact forms with correct rep info
5. **Local Impact**: "This bill affects 15,000 people in your district"

**Cost Comparison:**
- **Geocodio**: $0.50 per 1,000 lookups (free tier: 2,500/day)
- **Congress.gov**: Free but slower and requires multiple calls
- **Recommendation**: Use Geocodio for onboarding, Congress.gov for bill data

### 7.6 Vultr Object Storage (CORRECTED: S3-compatible API)

```ts
// lib/storage/vultr.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.VULTR_STORAGE_ENDPOINT, // e.g., https://ewr1.vultrobjects.com
  credentials: {
    accessKeyId: process.env.VULTR_ACCESS_KEY!,
    secretAccessKey: process.env.VULTR_SECRET_KEY!,
  },
  region: 'us-east-1', // Vultr uses us-east-1 for compatibility
});

export async function uploadPodcast(
  audioBuffer: Buffer,
  userId: string,
  type: 'daily' | 'weekly',
  metadata: {
    duration: number;
    billsCovered: string[];
    generatedAt: Date;
  }
): Promise<string> {
  const key = `podcasts/${userId}/${Date.now()}.mp3`;

  await s3Client.send(new PutObjectCommand({
    Bucket: 'civic-pulse-audio',
    Key: key,
    Body: audioBuffer,
    ContentType: 'audio/mpeg',
    Metadata: {
      duration: String(metadata.duration),
      bills: metadata.billsCovered.join(','),
      generated: metadata.generatedAt.toISOString(),
    },
    CacheControl: 'public, max-age=31536000', // 1 year cache
  }));

  // Return CDN URL
  return `${process.env.VULTR_CDN_URL}/${key}`;
}
```

---

## 8. FEATURE SPECIFICATIONS

### 8.1 User Onboarding with Geocodio (shadcn/ui)

**Enhanced Flow with Instant Representative Lookup**

```tsx
// app/onboarding/page.tsx

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [zipCode, setZipCode] = useState('');
  const [representatives, setRepresentatives] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleZipCodeSubmit = async () => {
    setLoading(true);

    // Call Geocodio via our API
    const response = await fetch('/api/onboarding/lookup-reps', {
      method: 'POST',
      body: JSON.stringify({ zipCode })
    });

    const data = await response.json();
    setRepresentatives(data.representatives);
    setLoading(false);
    setStep(2);
  };

  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Civic Pulse</CardTitle>
          <CardDescription>
            Let's personalize your experience in 3 quick steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="zip">What's your ZIP code?</Label>
                <Input
                  id="zip"
                  placeholder="94102"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  maxLength={5}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  We'll find your representatives instantly
                </p>
              </div>
              <Button onClick={handleZipCodeSubmit} disabled={loading}>
                {loading ? 'Finding your reps...' : 'Continue'}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-4">Your Representatives</h3>
                <div className="space-y-3">
                  {representatives.map((rep) => (
                    <div key={rep.bioguide_id} className="flex items-center gap-4 p-3 border rounded">
                      <Avatar>
                        <AvatarImage src={rep.photo} alt={rep.name} />
                        <AvatarFallback>{rep.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{rep.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary">{rep.party}</Badge>
                          <Badge variant="outline">
                            {rep.type === 'representative' ? 'House' : 'Senate'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={() => setStep(3)}>
                Next: Choose Your Interests
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {/* Interest selection */}
              <InterestSelector />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Key Features:**
- User enters zip code
- Geocodio API lookup (< 1 second)
- Display all 3 representatives with photos
- Save to user profile automatically
- Use for podcast personalization immediately

```tsx
// app/onboarding/page.tsx

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function OnboardingPage() {
  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Civic Pulse</CardTitle>
          <CardDescription>
            Let's personalize your experience in 3 quick steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingSteps />
        </CardContent>
      </Card>
    </div>
  )
}
```

### 8.2 Dashboard (shadcn/ui)

```tsx
// app/dashboard/page.tsx

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  return (
    <div className="container py-6 space-y-8">
      {/* Latest Episode */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Your Daily Brief</h2>
            <p className="text-muted-foreground">October 26, 2025 • 6 min</p>
          </div>
          <Badge>New</Badge>
        </div>

        <AudioPlayer episodeId={latestEpisode.id} />
      </Card>

      {/* Representatives */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Your Representatives</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {representatives.map(rep => (
            <RepresentativeCard key={rep.id} rep={rep} />
          ))}
        </div>
      </div>

      {/* Bills */}
      <Tabs defaultValue="action">
        <TabsList>
          <TabsTrigger value="action">Require Attention</TabsTrigger>
          <TabsTrigger value="recent">Recent Updates</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
```

### 8.3 Legislation Page with Search (shadcn/ui + Algolia)

**Purpose:** Browse and search all congressional bills with fast, relevant results

```tsx
// app/legislation/page.tsx

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BillSearchComponent } from "@/components/dashboard/bill-search"

export default function LegislationPage() {
  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Congressional Legislation</h1>
        <p className="text-muted-foreground">
          Search and explore bills from the U.S. Congress
        </p>
      </div>

      {/* Search Bar (Algolia InstantSearch) */}
      <Card>
        <CardContent className="pt-6">
          <BillSearchComponent />
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-4">
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Congress" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="118">118th Congress</SelectItem>
            <SelectItem value="117">117th Congress</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="healthcare">Healthcare</SelectItem>
            <SelectItem value="economy">Economy</SelectItem>
            <SelectItem value="climate">Climate</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="introduced">Introduced</SelectItem>
            <SelectItem value="passed-house">Passed House</SelectItem>
            <SelectItem value="passed-senate">Passed Senate</SelectItem>
            <SelectItem value="enacted">Enacted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        {/* Results grid populated by Algolia */}
      </div>
    </div>
  )
}
```

**Key Features:**
- **Algolia-powered search**: Sub-20ms response times
- **Faceted filtering**: By congress, category, status, party
- **Typo-tolerance**: "helthcare" finds "healthcare"
- **Pagination**: Load more results on demand
- **Mobile-responsive**: Works on all devices

### 8.4 Bill Detail Page (shadcn/ui)

**Purpose:** Deep dive into individual bills with full text, analysis, and context

```tsx
// app/legislation/[billId]/page.tsx

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"

export default async function BillDetailPage({ params }: { params: { billId: string } }) {
  const bill = await getBillDetails(params.billId);

  return (
    <div className="container py-6 space-y-8">
      {/* Bill Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{bill.full_bill_id.toUpperCase()}</Badge>
              <Badge>{bill.status}</Badge>
              {bill.is_enacted && <Badge variant="success">Enacted</Badge>}
            </div>
            <h1 className="text-3xl font-bold">{bill.title}</h1>
          </div>
          <Button>Track This Bill</Button>
        </div>

        <div className="flex gap-6 text-sm text-muted-foreground">
          <div>
            <span className="font-medium">Sponsor:</span>{' '}
            <a href={`/representatives/${bill.sponsor_bioguide_id}`} className="underline">
              {bill.sponsor_name} ({bill.sponsor_party}-{bill.sponsor_state})
            </a>
          </div>
          <div>
            <span className="font-medium">Introduced:</span> {formatDate(bill.introduced_date)}
          </div>
          <div>
            <span className="font-medium">Last Action:</span> {formatDate(bill.latest_action_date)}
          </div>
        </div>
      </div>

      {/* Progress Tracker */}
      <Card>
        <CardHeader>
          <CardTitle>Legislative Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={calculateProgress(bill.status)} className="h-2" />
          <div className="flex justify-between mt-4 text-sm">
            <span className={bill.status >= 'introduced' ? 'font-medium' : 'text-muted-foreground'}>
              Introduced
            </span>
            <span className={bill.status >= 'passed-house' ? 'font-medium' : 'text-muted-foreground'}>
              House
            </span>
            <span className={bill.status >= 'passed-senate' ? 'font-medium' : 'text-muted-foreground'}>
              Senate
            </span>
            <span className={bill.is_enacted ? 'font-medium' : 'text-muted-foreground'}>
              Enacted
            </span>
          </div>
        </CardContent>
      </Card>

      {/* AI Summary (Claude-generated) */}
      <Card>
        <CardHeader>
          <CardTitle>Plain English Summary</CardTitle>
          <CardDescription>AI-generated summary by Claude Sonnet 4</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{bill.plain_english_summary}</p>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="provisions">
        <TabsList>
          <TabsTrigger value="provisions">Key Provisions</TabsTrigger>
          <TabsTrigger value="impact">Who's Affected</TabsTrigger>
          <TabsTrigger value="full-text">Full Text</TabsTrigger>
          <TabsTrigger value="votes">Votes</TabsTrigger>
        </TabsList>

        <TabsContent value="provisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>What This Bill Does</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {JSON.parse(bill.key_provisions).map((provision, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{provision}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Who's Affected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {JSON.parse(bill.affected_groups).map((group, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <Badge
                      variant={
                        group.impact === 'positive'
                          ? 'success'
                          : group.impact === 'negative'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {group.impact}
                    </Badge>
                    <div>
                      <p className="font-medium">{group.group}</p>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="full-text">
          <Card>
            <CardHeader>
              <CardTitle>Full Bill Text</CardTitle>
              <CardDescription>
                Official text from Congress.gov
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {bill.full_text || (
                  <a href={bill.full_text_url} target="_blank" className="underline">
                    View on Congress.gov →
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="votes">
          <Card>
            <CardHeader>
              <CardTitle>Voting Record</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Vote visualizations */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cosponsors */}
      <Card>
        <CardHeader>
          <CardTitle>Cosponsors ({bill.cosponsor_count})</CardTitle>
          <CardDescription>
            {bill.is_bipartisan ? 'Bipartisan support' : 'Single-party support'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* List of cosponsors */}
        </CardContent>
      </Card>

      {/* Your Representatives' Position */}
      <Card>
        <CardHeader>
          <CardTitle>Your Representatives</CardTitle>
          <CardDescription>How your reps voted or their stance</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Representative cards with voting positions */}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button>Contact Your Representative</Button>
        <Button variant="outline">Share This Bill</Button>
        <Button variant="outline">Add to Podcast</Button>
      </div>
    </div>
  )
}
```

**Key Features:**
- **Progressive disclosure**: Summary first, full text on demand
- **AI-powered analysis**: Claude breaks down complex legislation
- **Visual progress tracker**: See where the bill is in the process
- **Impact analysis**: Understand who's affected and how
- **Representative positions**: See how your reps voted
- **Action-oriented**: Contact reps, share, track bills
- **Mobile-optimized**: Responsive tabs and collapsible sections

**Data Flow:**
1. User searches or browses on `/legislation`
2. Clicks bill → navigates to `/legislation/hr100-118`
3. Frontend fetches full bill data from SQL database
4. If missing, triggers Congress.gov fetch → saves to DB → syncs to Algolia
5. Displays rich bill details with Claude analysis

---

## 9. PODCAST SYSTEM (DAILY + WEEKLY)

### 9.1 Podcast Generation Pipeline (CORRECTED)

```ts
// lib/podcast/generator.ts

import { generateDialogueScript } from '@/lib/ai/claude';
import { generateDialogue } from '@/lib/ai/elevenlabs';
import { uploadPodcast } from '@/lib/storage/vultr';
import { mcp } from '@raindrop/mcp';

export async function generatePodcast(
  userId: string,
  type: 'daily' | 'weekly'
): Promise<string> {

  const startTime = Date.now();

  // 1. Gather data from SQL database
  const userResult = await env.CIVIC_DB.prepare(
    `SELECT * FROM users WHERE id = ?`
  ).bind(userId).first();
  const userData = userResult;

  // 2. Get representatives and bills
  const representatives = await getRepresentatives(userData.zip_code);
  const bills = await getFeaturedBills(userData, type);

  // 3. Generate script with Claude (via env.AI.run())
  const script = await generateDialogueScript(bills, representatives, type);

  // 4. Generate complete audio with ElevenLabs (single call)
  const audioBuffer = await generateDialogue(script);

  // 5. Upload to Vultr Object Storage
  const audioUrl = await uploadPodcast(audioBuffer, userId, type, {
    duration: calculateDuration(audioBuffer),
    billsCovered: bills.map(b => b.id),
    generatedAt: new Date()
  });

  // 6. Save episode to database
  const episodeId = generateUUID();
  await env.CIVIC_DB.prepare(`
    INSERT INTO podcast_episodes (
      id, user_id, episode_type, title, audio_url,
      featured_bills, featured_representatives,
      generation_status, generation_duration_seconds
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      episodeId, userId, type, script.title, audioUrl,
      JSON.stringify(bills.map(b => b.id)),
      JSON.stringify(representatives.map(r => r.id)),
      'completed', Math.floor((Date.now() - startTime) / 1000)
    )
    .run();

  return episodeId;
}
```

### 9.2 News Integration: The Hill RSS Feeds (Marketplace-Style Engagement)

**INSPIRED BY:** NPR's Marketplace - https://www.marketplace.org/shows/marketplace

**CONCEPT:** Blend breaking news from The Hill with bill tracking to create contextual, engaging podcasts that feel like professional journalism rather than dry legislative summaries.

#### 8.2.1 The Hill RSS Feed Architecture

**Available Feeds:**

**News Feeds** (Everyone Gets These):
- **Senate**: https://thehill.com/rss/feed/senate
- **House**: https://thehill.com/rss/feed/house-of-representatives
- **Administration**: https://thehill.com/rss/feed/administration
- **Campaign**: https://thehill.com/rss/feed/campaign

**Policy Feeds** (Based on User Interests):
- **Healthcare**: https://thehill.com/rss/feed/healthcare
- **Defense**: https://thehill.com/rss/feed/defense
- **Energy & Environment**: https://thehill.com/rss/feed/energy-environment
- **Finance**: https://thehill.com/rss/feed/finance
- **Technology**: https://thehill.com/rss/feed/technology
- **Transportation**: https://thehill.com/rss/feed/transportation
- **International**: https://thehill.com/rss/feed/international

#### 8.2.2 Interest-to-Feed Mapping

```typescript
// lib/rss/the-hill-feeds.ts

export const INTEREST_TO_FEED_MAP: Record<string, string[]> = {
  'healthcare': ['healthcare'],
  'defense': ['defense'],
  'climate': ['energy-environment'],
  'economy': ['finance'],
  'technology': ['technology'],
  'housing': ['finance'],
  'education': ['finance'],
  'immigration': ['administration'],
  'justice': ['administration'],
  'agriculture': ['energy-environment'],
  'veterans': ['defense'],
  'trade': ['international'],
  'transportation': ['transportation'],
  'infrastructure': ['finance', 'transportation'],
  'civil-rights': ['administration']
};

export function getFeedsForInterests(interests: string[]): RSSFeed[] {
  const feedIds = new Set<string>();

  // Always include general feeds
  feedIds.add('senate');
  feedIds.add('house');

  // Add policy feeds based on interests
  interests.forEach(interest => {
    const mappedFeeds = INTEREST_TO_FEED_MAP[interest] || [];
    mappedFeeds.forEach(feedId => feedIds.add(feedId));
  });

  return THE_HILL_FEEDS.filter(feed => feedIds.has(feed.id));
}
```

#### 8.2.3 Enhanced Podcast Generation with News Context

**Updated Pipeline:**

```typescript
// lib/podcast/generator-with-news.ts

import { parseRSSFeed } from '@/lib/rss/parser';
import { getFeedsForInterests } from '@/lib/rss/the-hill-feeds';
import { generateDialogueScript } from '@/lib/ai/claude';
import { generateDialogue } from '@/lib/ai/elevenlabs';
import { uploadPodcast } from '@/lib/storage/vultr';
import { mcp } from '@raindrop/mcp';

export async function generatePodcastWithNews(
  userId: string,
  type: 'daily' | 'weekly'
): Promise<string> {

  const startTime = Date.now();

  // 1. Get user data
  const userResult = await env.CIVIC_DB.prepare(
    `SELECT * FROM users WHERE id = ?`
  ).bind(userId).first();
  const userData = userResult;

  // 2. Get representatives and bills
  const representatives = await getRepresentatives(userData.zip_code);
  const bills = await getFeaturedBills(userData, type);

  // 3. **NEW: Fetch relevant news from The Hill**
  const userInterests = JSON.parse(userData.interests);
  const feeds = getFeedsForInterests(userInterests);

  const newsArticles = await Promise.all(
    feeds.map(feed => parseRSSFeed(feed.url))
  ).then(results => results.flat());

  // 4. **NEW: Match news to bills** (same issue categories)
  const newsWithBills = matchNewsToBills(newsArticles, bills);

  // 5. Generate Marketplace-style script with Claude
  const script = await generateDialogueScriptWithNews(
    bills,
    newsWithBills,
    representatives,
    type
  );

  // 6. Generate complete audio with ElevenLabs (single call)
  const audioBuffer = await generateDialogue(script);

  // 7. Upload to Vultr Object Storage
  const audioUrl = await uploadPodcast(audioBuffer, userId, type, {
    duration: calculateDuration(audioBuffer),
    billsCovered: bills.map(b => b.id),
    generatedAt: new Date()
  });

  // 8. Save episode to database (with news references)
  const episodeId = generateUUID();
  await env.CIVIC_DB.prepare(`
    INSERT INTO podcast_episodes (
      id, user_id, episode_type, title, audio_url,
      featured_bills, featured_representatives,
      script_json, generation_status, generation_duration_seconds
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      episodeId, userId, type, script.title, audioUrl,
      JSON.stringify(bills.map(b => b.id)),
      JSON.stringify(representatives.map(r => r.id)),
      JSON.stringify({ news: newsWithBills, script }),
      'completed', Math.floor((Date.now() - startTime) / 1000)
    )
    .run();

  return episodeId;
}
```

#### 8.2.4 News-Enhanced Dialogue Script Generation

**Claude Prompt (Updated for Marketplace Style):**

```typescript
// lib/ai/claude-with-news.ts

export async function generateDialogueScriptWithNews(
  bills: Bill[],
  newsArticles: NewsArticle[],
  representatives: Representative[],
  type: 'daily' | 'weekly'
) {
  const prompt = `
You are creating a Marketplace-style podcast (NPR format) with hosts Sarah and James.
Blend breaking news from The Hill with congressional bill tracking for engaging, contextual discussion.

**STYLE GUIDE:**
- Start with news (what's happening NOW)
- Transition to related bills naturally
- Explain connections between news and legislation
- Use conversational tone with contractions
- Include acknowledgments ("That's right", "Exactly", "Good point")
- Plain language - no jargon
- Professional but accessible (like Marketplace or The Daily)

**FORMAT:**
Return JSON array:
[
  { "host": "sarah", "text": "..." },
  { "host": "james", "text": "..." }
]

**STRUCTURE (${type === 'daily' ? 'Daily 5-7 min' : 'Weekly 15-18 min'}):**

${type === 'daily' ? `
1. Opening (30s)
   Sarah: "Good morning! Here's your daily brief for [date]"

2. News + Bill #1 (2 min)
   - Start with breaking news from The Hill
   - Transition: "This connects directly to [Bill Number]..."
   - Explain the bill in context of the news

3. News + Bill #2 (2 min)
   - Same pattern

4. Your Representatives (1 min)
   - Quick update on what your reps are doing

5. Closing (30s)
   - "Here's what to watch for next..."
` : `
1. Opening (1 min)
   Sarah: "Welcome to your weekly deep dive for [date]"
   James: "This week in Congress..."

2. Week in Review (2 min)
   - Top 3 news stories from The Hill
   - What's driving the conversation

3. Deep Dive: News + Bills (10 min)
   - For each major bill:
     * Start with related news context
     * Break down the bill provisions
     * Explain real-world impact
     * Your representatives' positions

4. What This Means for You (3 min)
   - Practical implications
   - How to take action

5. Looking Ahead (2 min)
   - What's coming next week
   - Bills to watch

6. Closing (1 min)
   - Call to action
`}

**EXAMPLE DIALOGUE OPENING:**

Sarah: "Good morning! The Hill just reported that the House Ways and Means Committee advanced healthcare reform legislation yesterday. James, what's behind this move?"

James: "Well Sarah, this ties directly into H.R. 1234 - the Healthcare Access Act - that many of our listeners are tracking. The committee vote happened just two days after the CBO released cost estimates showing this could save families an average of $800 per year."

Sarah: "So let's break down what this bill actually does..."

**NEWS ARTICLES:**
${JSON.stringify(newsArticles, null, 2)}

**BILLS:**
${JSON.stringify(bills.map(b => ({
  number: b.number,
  title: b.title,
  summary: b.plain_english_summary,
  issueCategories: b.issue_categories
})), null, 2)}

**YOUR REPRESENTATIVES:**
${representatives.map(r => `${r.name} (${r.party}) - ${r.chamber}`).join(', ')}

Create an engaging, informative dialogue that makes legislation accessible through current events.
`;

  const result = await env.AI.run('claude-sonnet-4-20250514', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: type === 'daily' ? 3000 : 6000
  });

  return JSON.parse(result.content[0].text);
}
```

#### 8.2.5 News-to-Bill Matching Logic

```typescript
// lib/podcast/news-matcher.ts

interface NewsWithBill {
  article: NewsArticle;
  relatedBills: Bill[];
}

export function matchNewsToBills(
  newsArticles: NewsArticle[],
  bills: Bill[]
): NewsWithBill[] {
  return newsArticles.map(article => {
    // Match based on keywords in title/description
    const articleText = `${article.title} ${article.description}`.toLowerCase();

    const relatedBills = bills.filter(bill => {
      const billCategories = JSON.parse(bill.issue_categories || '[]');

      // Check if any bill category appears in article text
      return billCategories.some(category =>
        articleText.includes(category.toLowerCase())
      );
    });

    return {
      article,
      relatedBills: relatedBills.slice(0, 2) // Max 2 related bills per article
    };
  }).filter(news => news.relatedBills.length > 0); // Only include news with matching bills
}
```

#### 8.2.6 User Benefits

**Why This Approach:**

1. **Context**: News explains WHY a bill matters right now
2. **Engagement**: Feels like listening to NPR, not reading legislative text
3. **Relevance**: Connects legislation to breaking events users already hear about
4. **Natural Flow**: Hosts have something to react to and discuss
5. **Marketplace Model**: Professional journalism format with accessible language

**Example Daily Brief Flow (6 minutes):**

- **0:00-0:30** - Opening: "Here's what's happening today"
- **0:30-2:30** - The Hill news story #1 + related bill H.R. 1234
- **2:30-4:30** - The Hill news story #2 + related bill S. 567
- **4:30-5:30** - Your representatives: What they're doing this week
- **5:30-6:00** - Closing: "Here's what to watch for tomorrow"

**Example Weekly Deep Dive (16 minutes):**

- **0:00-1:00** - Opening: "Welcome to your weekly deep dive"
- **1:00-3:00** - Week in review: Top 3 stories from The Hill
- **3:00-10:00** - Deep dive on 2-3 major bills with news context
- **10:00-13:00** - "What this means for you" - practical impacts
- **13:00-15:00** - Looking ahead: Bills to watch, upcoming votes
- **15:00-16:00** - Closing: Call to action

---

## 10. USER EXPERIENCE & DESIGN

Uses shadcn/ui components throughout for consistent, accessible design. All components are built with Radix UI primitives and styled with Tailwind CSS.

---

## 11. VOICE AGENT IMPLEMENTATION

**ElevenLabs text-to-dialogue endpoint** generates complete multi-host conversations in a single API call. This provides:
- Natural conversational flow
- Proper timing and pacing
- No manual audio stitching required
- Professional NPR-quality output

---

## 12. RESPONSIVE DESIGN REQUIREMENTS

- **Mobile-first**: Touch targets min 44x44px
- **Test breakpoints**: iPhone SE (375px), iPad (768px), Desktop (1920px)
- **Audio player**: Fixed at bottom on mobile with background playback support

---

## 13. PAYMENT & MONETIZATION

**Freemium Model:**

- **Free**: 1 weekly podcast, basic dashboard
- **Premium ($9.99/mo)**: Daily + weekly podcasts, unlimited tracking

**Stripe Integration** with webhook handlers for subscription management.

---

## 14. HACKATHON IMPLEMENTATION TIMELINE

### Critical Path (24 Hours)
1. ✅ Setup (3hrs): Raindrop + Vultr + API keys
2. ✅ Database & APIs (4hrs): SQL schema + Congress.gov client + Algolia integration
3. ✅ Authentication (4hrs): WorkOS integration
4. ✅ Podcast Generation (5hrs): Claude + ElevenLabs + Vultr upload
5. ✅ Dashboard UI (4hrs): shadcn/ui components
6. ✅ Payments (2hrs): Stripe checkout
7. ✅ Polish & Deploy (2hrs): Testing + deployment

---

## 15. COMPETITION CATEGORY ALIGNMENT

### 15.1 Best Voice Agent
- Sophisticated dual-voice system (Sarah + James)
- ElevenLabs text-to-dialogue integration
- Dual format (daily 5-7min + weekly 15-18min)
- NPR-quality production

### 15.2 Best AI Solution for Public Good
- Addresses civic disengagement crisis
- Claude Sonnet 4 for bill analysis
- Scalable to all 435 districts
- Non-partisan and transparent

---

## 16. DEPLOYMENT STRATEGY

### 16.1 Deployment Steps

1. **Deploy to Raindrop Platform** (serverless)
2. **Configure Vultr Object Storage** (S3-compatible)
3. **Set up WorkOS authentication**
4. **Configure Stripe webhooks**
5. **Test end-to-end flow**

### 16.2 Environment Variables

```shell
# App Config
NEXT_PUBLIC_APP_URL=https://civicpulse.com

# Raindrop Platform
RAINDROP_SQL_DATABASE_ID=civic-pulse-db

# Vultr
VULTR_STORAGE_ENDPOINT=https://ewr1.vultrobjects.com
VULTR_ACCESS_KEY=...
VULTR_SECRET_KEY=...
VULTR_CDN_URL=https://cdn.civicpulse.com

# Congress.gov
CONGRESS_API_KEY=...

# Anthropic (Claude)
ANTHROPIC_API_KEY=...

# ElevenLabs
ELEVENLABS_API_KEY=...
ELEVENLABS_SARAH_VOICE_ID=...
ELEVENLABS_JAMES_VOICE_ID=...

# WorkOS (Authentication)
WORKOS_API_KEY=...
WORKOS_CLIENT_ID=...
WORKOS_REDIRECT_URI=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PREMIUM_PRICE_ID=...
```

---

## END OF PRD v2.2

**Document Version:** 2.2 (SQL + Algolia Search Edition)
**Last Updated:** October 27, 2025
**Platform:** Raindrop Platform + Vultr Object Storage + Next.js 16
**Competition:** Liquid Metal Hackathon
**Categories:** Best Voice Agent, Best AI Solution for Public Good

**✅ ALIGNED WITH ACTUAL RAINDROP CAPABILITIES**
**✅ USES CORRECT IMPLEMENTATION PATTERNS**
**✅ FOLLOWS CLAUDE.MD RULES**

**Key Corrections Applied:**
- ✅ SQLite schema with programmatic initialization (not PostgreSQL)
- ✅ Standard SQL with prepared statements (not SmartSQL)
- ✅ Algolia search with progressive caching from Congress.gov
- ✅ WorkOS authentication (not "Raindrop Auth")
- ✅ Actual Raindrop patterns (env.CIVIC_DB.prepare().bind())
- ✅ Direct env.AI.run() (no wrapper)
- ✅ ElevenLabs text-to-dialogue (from lib/ai/claude.md)
- ✅ Congress.gov implementation (from lib/api/claude.md)
- ✅ Vultr Object Storage only (not Bare Metal)
- ✅ Fixed TTLs (24hr bills, 7 days members)
- ✅ Legislation page with search and bill detail pages

**Let's build this correctly! 🚀🎙️**
