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

## 6. SEARCH ARCHITECTURE (ALGOLIA + RAINDROP + SQL)

**Three-Layer Search Strategy: Fast, Flexible, and Semantic**

**Complete reference:** See `/docs/SEARCH.md` for full implementation details

### 6.1 Search Vision

Users should be able to find bills **as easily as Googling**—whether they know the bill number or just have a vague idea. From search results, tracking a bill should be **one tap away**.

### 6.2 Three Search Paths (Based on User Intent)

Based on user research, we support three distinct search patterns:

1. **Directed Search (20%)**: "Find H.R. 1234" → Instant bill lookup
2. **Exploratory Search (60%)**: "Show me healthcare bills" → Faceted filtering
3. **Discovery Search (20%)**: "How does this affect me?" → AI-powered semantic search

### 6.3 Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                 USER SEARCH QUERY                     │
└──────────────────────────────────────────────────────┘
                         ↓
          ┌──────────────┴──────────────┐
          │  Query Type Detection        │
          │  (Bill # | Keyword | NL)     │
          └──────────────┬──────────────┘
                         ↓
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│  DIRECTED    │ │ EXPLORATORY │ │  DISCOVERY   │
│ Bill Number  │ │  Faceted    │ │  Semantic    │
└──────┬───────┘ └──────┬──────┘ └──────┬───────┘
       ↓                ↓                ↓
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│ Raindrop SQL │ │   Algolia   │ │ SmartBuckets │
│   <10ms      │ │    <50ms    │ │    <200ms    │
└──────┬───────┘ └──────┬──────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        ↓
                 ┌──────────────┐
                 │ KV Cache     │
                 │ (1hr TTL)    │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │ Personalized │
                 │   Ranking    │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │ Ranked Results│
                 └───────────────┘
```

### 6.4 Layer 1: Directed Search (Bill Number Lookup)

**User Intent:** "I know the bill number, just show me the bill."

**Examples:** "H.R. 1234", "S. 567", "HR1234"

**Implementation:**
```typescript
// lib/search/directed-search.ts
export async function directBillLookup(
  query: string,
  env: Env
): Promise<Bill | null> {
  // Parse bill number (H.R. 1234, S. 567, etc.)
  const billPattern = /^(H\.?R\.?|S\.?)\s*(\d+)$/i;
  const match = query.trim().match(billPattern);

  if (!match) return null;

  const chamber = match[1].toLowerCase().includes('s') ? 'Senate' : 'House';
  const number = parseInt(match[2]);

  // Direct SQL lookup (fastest path)
  const result = await executeQuery(
    `SELECT * FROM bills
     WHERE chamber = ? AND bill_number = ?
     ORDER BY congress DESC
     LIMIT 1`,
    'bills',
    [chamber, number]
  );

  return result.rows[0] || null;
}
```

**Performance:** <10ms (direct SQL query)

### 6.5 Layer 2: Exploratory Search (Faceted Filtering)

**User Intent:** "I want to browse bills by topic/status/party."

**Examples:** "healthcare bills", "bills passed by the House", "education bills sponsored by Republicans"

**Implementation:**
- **Algolia** for lightning-fast full-text search
- Real-time facet updates (no page reload)
- Personalization based on user location, interests, tracked bills

**Algolia Index Schema:**
```typescript
interface AlgoliaBillRecord {
  objectID: string;           // bill.id
  billNumber: string;         // "H.R. 1234"
  congress: number;           // 118
  title: string;              // Full title for search
  plainEnglishSummary: string;// AI-generated summary
  summary: string;            // Official summary
  sponsorName: string;        // "Rep. Nancy Pelosi"
  sponsorParty: string;       // "D"
  sponsorState: string;       // "CA"
  issueCategories: string[];  // ["Healthcare", "Economy"]
  statesAffected: string[];   // ["WI", "MN", "MI"]
  billStatus: string;         // "Passed House"
  trackingCount: number;      // 1234 (popularity)
  progressScore: number;      // 0-1 scale
  bipartisanScore: number;    // 0-1 scale
  introducedTimestamp: number;// Unix timestamp
}
```

**Algolia Configuration:**
```typescript
await billsIndex.setSettings({
  searchableAttributes: [
    'billNumber',        // Highest priority
    'title',
    'shortTitle',
    'plainEnglishSummary',
    'summary',
    'sponsorName',
    'cosponsorNames',
    'topics'
  ],
  attributesForFaceting: [
    'searchable(issueCategories)',
    'congress',
    'sponsorParty',
    'sponsorState',
    'billStatus',
    'statesAffected',
    'bipartisanScore'
  ],
  customRanking: [
    'desc(trackingCount)',    // Popular bills first
    'desc(progressScore)',    // Active bills first
    'desc(bipartisanScore)',  // Bipartisan bills boosted
    'desc(introducedTimestamp)' // Recent bills preferred
  ],
  typoTolerance: true,
  minWordSizefor1Typo: 4,
  minWordSizefor2Typos: 8
});
```

**Performance:** <50ms (Algolia query)

### 6.6 Layer 3: Discovery Search (Semantic Matching)

**User Intent:** "I don't know what I'm looking for, help me find it."

**Examples:** "bills that help college students with debt", "how will this affect small businesses in Wisconsin", "what are they doing about climate change"

**Implementation:**
- **Raindrop SmartBuckets** for semantic search on bill summaries
- **AI-generated explanations** of why bills match the query
- **Hybrid scoring:** 50% semantic + 20% location + 20% interests + 10% popularity

```typescript
// lib/search/discovery-search.ts
export async function discoverySearch(
  naturalLanguageQuery: string,
  userId: string,
  env: Env
): Promise<DiscoveryResults> {
  // Step 1: SmartBuckets semantic search
  const semanticResults = await env.BILL_SUMMARIES.chunkSearch({
    input: naturalLanguageQuery,
    requestId: `discovery-${userId}-${Date.now()}`
  });

  // Step 2: Extract bill IDs from semantic matches
  const billIds = semanticResults.results
    .filter(result => result.score && result.score > 0.7)
    .map(result => extractBillId(result.source))
    .slice(0, 20);

  // Step 3: Fetch full bill data from SQL
  const bills = await executeQuery(
    `SELECT * FROM bills WHERE id IN (${billIds.map(() => '?').join(',')})`,
    'bills',
    billIds
  );

  // Step 4: Re-rank with user context
  const userProfile = await getUserProfile(userId, env);
  const rankedBills = rankByRelevance(bills.rows, userProfile, semanticResults.results);

  // Step 5: Generate AI explanation
  const explanation = await generateSearchExplanation(
    naturalLanguageQuery,
    rankedBills.slice(0, 3),
    env
  );

  return {
    bills: rankedBills,
    explanation,
    semanticScores: semanticResults.results
  };
}
```

**Performance:** <200ms (SmartBuckets) + <50ms (SQL) + <500ms (AI) = <800ms total

### 6.7 Raindrop Platform Integration

**Raindrop Components Used:**

1. **Raindrop SQL** (Primary Database)
   - Canonical source of truth for bills
   - Full bill text, metadata, relationships
   - User tracking preferences

2. **Raindrop KV Cache** (Performance Layer)
   - Cache popular search queries (1hr TTL)
   - Cache Congress.gov API responses (24hr TTL)
   - Cache Algolia results for repeated queries

3. **Raindrop SmartBuckets** (Semantic Layer)
   - Bill summaries indexed for RAG search
   - Plain-English queries
   - Multi-modal document processing

4. **Raindrop Task** (Algolia Sync)
   - Cron job every 6 hours
   - Sync updated bills from SQL to Algolia
   - Maintain search index freshness

**raindrop.manifest:**
```hcl
application "civic-pulse" {
  sql_database "civic-db" {}
  kv_cache "search-cache" {}
  smartbucket "bill-summaries" {}

  task "algolia-sync" {
    schedule = "0 */6 * * *"  # Every 6 hours
  }

  service "search-api" {
    visibility = "public"
  }
}
```

### 6.8 Search UX: Simple vs Advanced Modes

**Simple Mode (Default)** - For casual users:
- Large search bar (prominent, inviting)
- Autocomplete dropdown (instant suggestions)
- Quick filter pills (top 3 categories only)
- "Track this bill" button on every result
- Switch to advanced mode (bottom of page)

**Advanced Mode** - For power users:
- Full faceted filtering sidebar
- Keyword vs semantic search toggle
- Active filter pills (easy removal)
- Sort options (relevance, date, popularity, bipartisan support)
- Compact result cards (more per page)
- Pagination controls

**Mobile Search Overlay:**
- Full-screen overlay (no distraction)
- Slide-up filter drawer
- Touch-optimized controls
- Infinite scroll (vs pagination)
- Swipe to dismiss filter drawer

### 6.9 Bill Tracking from Search Results

**One-Tap Tracking:**

Every search result card includes a prominent "Track" button with three modes:

1. **Watch** (default): Get updates on bill status changes
2. **Support**: Publicly support the bill + notifications
3. **Oppose**: Publicly oppose the bill + notifications

```typescript
// Tracking API endpoint
POST /api/bills/track
{
  billId: string;
  trackingType: 'watching' | 'supporting' | 'opposing';
  notificationPreferences: {
    statusChanges: boolean;
    voteScheduled: boolean;
    amendments: boolean;
  };
}
```

**Tracking Workflow:**
1. User clicks "Track" button on search result
2. API creates entry in `user_tracked_bills` table
3. Increments `tracking_count` on bill (for popularity ranking)
4. Bill appears in user's tracked bills dashboard
5. User receives notifications based on preferences

### 6.10 Performance Targets & Cost Optimization

**Performance Targets:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Search response time | <500ms | p95 |
| Autocomplete latency | <100ms | p95 |
| Cache hit rate | >60% | Daily average |
| Algolia query time | <50ms | p95 |
| SQL query time | <100ms | p95 |
| SmartBuckets semantic search | <200ms | p95 |
| Page load time | <2s | Lighthouse |

**Cost Optimization:**

**Algolia Pricing:**
- Free tier: 10,000 searches/month
- Growth: $1 per 1,000 searches
- Estimated usage: 50,000 searches/month = $40/month
- KV Cache saves 60% → Actual cost: $24/month

**Raindrop Platform:**
- SQL database: Included in base plan
- KV Cache: $0.50 per million reads
- SmartBuckets: $10/month (1GB indexed)
- Tasks: Included in base plan

**Total estimated cost:** $35-50/month

### 6.11 Data Flow: Congress.gov → SQL → Algolia

```
┌──────────────────────────────────────┐
│     Congress.gov API (Source)        │
│  • Rate limit: 1 req/sec             │
│  • Cache: 24hr in KV Cache           │
└─────────────┬────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│      Raindrop SQL (Canonical)        │
│  • Full bill data + analysis         │
│  • User tracking preferences         │
│  • Source of truth                   │
└─────────────┬────────────────────────┘
              ↓
       ┌──────┴──────┐
       ↓             ↓
┌─────────────┐  ┌──────────────────┐
│   Algolia   │  │  SmartBuckets    │
│  (Indexed)  │  │  (Semantic RAG)  │
│  <50ms      │  │  <200ms          │
└─────────────┘  └──────────────────┘
       ↓             ↓
       └──────┬──────┘
              ↓
       ┌──────────────┐
       │  KV Cache    │
       │  (1hr TTL)   │
       └──────┬───────┘
              ↓
       ┌──────────────┐
       │    Results   │
       └──────────────┘
```

**Sync Strategy:**
- **Real-time:** Directed search (bill number) → SQL only
- **Hourly:** Congress.gov API → SQL → SmartBuckets
- **Every 6 hours:** SQL → Algolia (Task scheduler)
- **On-demand:** New bill discovered → SQL → Algolia async

### 6.12 Search Analytics

**Tracked Metrics:**
- Search queries per session
- Search-to-bill-page conversion rate
- Bill tracking rate from search results
- Cache hit rate (KV Cache + Algolia)
- Average search response time
- Search abandonment rate
- Popular search terms

**Success Criteria:**
- Search usage: >70% of active users
- Search-to-tracking conversion: >30%
- Cache hit rate: >60%
- Search response time: <500ms (p95)

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

### 9.2 News Integration: Comprehensive RSS Architecture (The Hill + Politico)

**INSPIRED BY:** NPR's Marketplace - https://www.marketplace.org/shows/marketplace

**VISION:** Transform Civic Pulse from a bill tracker into a comprehensive civic news platform that blends breaking news from The Hill and Politico with bill tracking, creating contextual, engaging experiences that feel like professional journalism.

**DETAILED PLAN:** See `/docs/NEWS_RSS_IMPLEMENTATION_PLAN.md` for complete technical architecture

---

#### 9.2.1 News Integration Overview

**Key Features:**

1. **Context-Aware News**
   - Bill-specific news on bill detail pages
   - Representative-specific news on rep profiles
   - Semantic matching using Raindrop SmartBuckets

2. **Personalized News Feeds**
   - Relevance scoring based on tracked bills, interests, geography
   - "Today's Must-Read" (top 3 most relevant articles)
   - "Bill Updates" (news about tracked bills)
   - "Your Reps in the News" (mentions of user's representatives)
   - Topic-based organization

3. **Marketplace-Style Podcasts**
   - Breaking news intros from The Hill/Politico
   - Seamless transitions to related bills
   - News context explains WHY bills matter NOW

**Raindrop Platform Architecture:**

```
RSS Sources → KV Cache (1hr TTL) → Task (Cron) → Queue → Observer → SQL + SmartBuckets
                                                                      ↓
                                    Service API ← Personalized Feed Logic
```

---

#### 9.2.2 RSS Feed Sources

**The Hill RSS Feeds:**

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

**Politico RSS Feeds:**

**News Feeds**:
- **Congress**: https://www.politico.com/rss/congress.xml
- **Politics**: https://www.politico.com/rss/politics.xml

**Policy Feeds**:
- **Healthcare**: https://www.politico.com/rss/healthcare.xml
- **Defense**: https://www.politico.com/rss/defense.xml
- **Energy**: https://www.politico.com/rss/energy.xml
- **Technology**: https://www.politico.com/rss/technology.xml
- **Finance**: https://www.politico.com/rss/economy.xml

---

#### 9.2.3 Raindrop Platform Architecture

**Component Breakdown:**

**A. KV Cache** (`news-feed-cache`)
- Purpose: Cache parsed RSS feeds (1 hour TTL)
- Key format: `rss:{source}:{category}:{timestamp}`
- Prevents redundant fetching

**B. Task** (`rss-poller`)
- Schedule: Every hour (`0 * * * *`)
- Function: Fetch all RSS feeds and cache them
- Sends new articles to processing queue

**C. Queue** (`news-processing-queue`)
- Purpose: Async article processing pipeline
- Payload: Article metadata + raw content
- Batching: 10 articles per batch

**D. Observer** (`news-processor`)
- Listens to: `news-processing-queue`
- Actions:
  1. Extract metadata (title, description, date, source)
  2. Categorize with AI (Claude/Llama)
  3. Store in SQL database
  4. Upload full text to SmartBucket
  5. Generate semantic matches to bills

**E. SQL Database** (`civic-db`)
- Tables: `news_articles`, `news_to_bills`
- Indexes: published_at, category, bill_id
- Stores structured metadata

**F. SmartBuckets** (`news-articles`)
- Purpose: RAG-powered semantic search
- Stores: Full article text
- Enables: Natural language queries, bill matching

**raindrop.manifest Configuration:**

```hcl
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

---

#### 9.2.4 Database Schema (News Articles)

```sql
-- News articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK(source IN ('thehill', 'politico')),
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

-- News-to-bills relationship table
CREATE TABLE IF NOT EXISTS news_to_bills (
  id TEXT PRIMARY KEY,
  news_article_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  relevance_score REAL NOT NULL CHECK(relevance_score >= 0 AND relevance_score <= 1),
  matched_keywords TEXT, -- JSON array
  semantic_score REAL, -- From SmartBuckets search
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (news_article_id) REFERENCES news_articles(id),
  FOREIGN KEY (bill_id) REFERENCES bills(id)
);

-- Indexes for performance
CREATE INDEX idx_news_published ON news_articles(published_at DESC);
CREATE INDEX idx_news_category ON news_articles(category);
CREATE INDEX idx_news_source ON news_articles(source);
CREATE INDEX idx_news_to_bills_bill ON news_to_bills(bill_id, relevance_score DESC);
CREATE INDEX idx_news_to_bills_news ON news_to_bills(news_article_id);
```

---

#### 9.2.5 News-to-Bill Matching Algorithm

**Hybrid Approach**: Semantic (SmartBuckets) + Keyword matching

```typescript
// lib/news/bill-matcher.ts
import { Env } from '@/raindrop.gen';

interface BillMatch {
  billId: string;
  relevanceScore: number; // 0.0 to 1.0
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

  // Step 3: Keyword extraction from article using AI
  const articleKeywords = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: [{
      role: 'user',
      content: `Extract 5-10 key policy-related keywords from this article:
Title: ${articleMetadata.title}
Description: ${articleMetadata.description}
Text: ${articleText.substring(0, 1000)}

Return only keywords as JSON array.`
    }]
  });

  // Step 4: Score each bill
  const matches: BillMatch[] = [];
  for (const bill of candidateBills.results) {
    const keywordOverlap = calculateKeywordOverlap(
      JSON.parse(articleKeywords.result),
      bill.issue_categories
    );
    const semanticScore = getSemanticScore(bill.id, semanticMatches.results);

    // Weighted scoring: 40% keyword, 60% semantic
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

  // Step 5: Return top 5 matches
  return matches
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
}
```

---

#### 9.2.6 Personalized News Feed Scoring

**Relevance Factors:**
1. **Tracked Bills** (40%): News about bills user is tracking
2. **User Interests** (30%): News matching selected issue categories
3. **Geography** (20%): News about user's representatives
4. **Recency** (10%): Newer articles score higher

```typescript
// lib/news/personalized-feed.ts
export async function getPersonalizedNewsFeed(
  userId: string,
  env: Env,
  options: { limit?: number; offset?: number } = {}
): Promise<PersonalizedNewsArticle[]> {
  // Get user preferences
  const user = await env.CIVIC_DB.prepare(
    `SELECT interests, state, district FROM users WHERE id = ?`
  ).bind(userId).first<User>();

  const trackedBills = await env.CIVIC_DB.prepare(
    `SELECT bill_id FROM tracked_bills WHERE user_id = ?`
  ).bind(userId).all();

  const userReps = await env.CIVIC_DB.prepare(
    `SELECT bioguide_id, name FROM representatives
     WHERE state = ? AND (district = ? OR chamber = 'senate')`
  ).bind(user.state, user.district).all();

  // Get recent news articles (last 7 days)
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
      userInterests.some(interest =>
        tag.toLowerCase().includes(interest.toLowerCase())
      )
    );
    score += (interestMatches.length / Math.max(articleTags.length, 1)) * 0.3;

    // 3. Geography - rep mentions (20%)
    const repMentions = userReps.results.some(rep =>
      article.title.includes(rep.name) || article.description.includes(rep.name)
    );
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

  // Sort by score and paginate
  return scoredArticles
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(options.offset || 0, (options.offset || 0) + (options.limit || 20));
}
```

---

#### 9.2.7 News Feed Organization

**Dashboard Sections:**

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

---

#### 9.2.8 Marketplace-Style Podcast Enhancement

**Integration Point**: Enhanced podcast generation with news context

```typescript
// lib/podcast/generator-with-news.ts (UPDATED)
import { Env } from '@/raindrop.gen';
import { getPersonalizedNewsFeed } from '@/lib/news/personalized-feed';
import { matchNewsToBills } from '@/lib/news/bill-matcher';

export async function generatePodcastWithNews(
  userId: string,
  type: 'daily' | 'weekly',
  env: Env
): Promise<PodcastEpisode> {
  const startTime = Date.now();

  // 1. Get user's tracked bills
  const trackedBills = await env.CIVIC_DB.prepare(
    `SELECT * FROM bills WHERE id IN (
      SELECT bill_id FROM tracked_bills WHERE user_id = ?
    ) LIMIT ?`
  ).bind(userId, type === 'daily' ? 2 : 3).all();

  // 2. Get personalized news feed (top 10 articles)
  const newsFeed = await getPersonalizedNewsFeed(userId, env, { limit: 10 });

  // 3. Get bill-specific news for top bills
  const billsWithNews = await Promise.all(
    trackedBills.results.slice(0, 3).map(async bill => {
      const relatedNews = await env.CIVIC_DB.prepare(`
        SELECT na.*, ntb.relevance_score
        FROM news_articles na
        JOIN news_to_bills ntb ON na.id = ntb.news_article_id
        WHERE ntb.bill_id = ?
        ORDER BY ntb.relevance_score DESC, na.published_at DESC
        LIMIT 3
      `).bind(bill.id).all();

      return { bill, news: relatedNews.results };
    })
  );

  // 4. Generate Marketplace-style dialogue script
  const scriptPrompt = generateMarketplacePrompt(
    type,
    billsWithNews,
    newsFeed.slice(0, 3) // Top 3 news articles
  );

  const script = await env.AI.run('@cf/anthropic/claude-sonnet-4', {
    messages: [{ role: 'user', content: scriptPrompt }],
    max_tokens: type === 'daily' ? 3000 : 6000
  });

  // 5. Generate audio with ElevenLabs text-to-dialogue
  const dialogue = JSON.parse(script.result);
  const audioBuffer = await generateDialogueAudio(dialogue, env);

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
    JSON.stringify(dialogue),
    JSON.stringify(billsWithNews.map(b => b.bill.id)),
    JSON.stringify(newsFeed.slice(0, 3).map(n => n.id)),
    new Date().toISOString()
  ).run();

  return {
    id: episode.meta.last_row_id,
    audioUrl,
    duration: type === 'daily' ? 420 : 1080, // 7 min or 18 min
    transcript: dialogue,
    billsCovered: billsWithNews,
    newsReferenced: newsFeed.slice(0, 3)
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

#### 9.2.9 API Endpoints

**A. Personalized News Feed**

```typescript
// app/api/news/feed/route.ts
import { Env } from '@/raindrop.gen';
import { getOrganizedNewsFeed } from '@/lib/news/feed-sections';

export async function GET(request: Request, env: Env) {
  const userId = await getUserIdFromSession(request);

  const sections = await getOrganizedNewsFeed(userId, env);

  return Response.json(sections);
}
```

**B. Bill-Specific News**

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

**C. Representative-Specific News**

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

#### 9.2.10 UI Components

**Dashboard News Feed:**

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

**Bill Page Related News:**

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

#### 9.2.11 Implementation Summary

**What This Adds to Civic Pulse:**

1. **Transform from Bill Tracker → Civic News Platform**
   - Complete news integration (The Hill + Politico)
   - Context-aware, personalized news feeds
   - Professional journalism experience

2. **Raindrop Platform Leverage**
   - KV Cache: RSS feed caching (1 hour TTL)
   - Task: Hourly RSS polling
   - Queue: Async article processing
   - Observer: Automated news indexing
   - SmartBuckets: RAG-powered semantic search
   - SQL: Structured news metadata

3. **User Experience Enhancements**
   - "Today's Must-Read" personalized section
   - Bill-specific news on bill pages
   - Rep-specific news on profile pages
   - Marketplace-style podcasts with news context

4. **Technical Achievements**
   - Hybrid news-to-bill matching (semantic + keyword)
   - Multi-factor relevance scoring (bills + interests + geography + recency)
   - Scalable background processing pipeline
   - Production-ready caching & performance

**Next Steps:**
1. Implement database migrations (news tables)
2. Set up Raindrop resources (KV Cache, SmartBuckets, Queue, Task, Observer)
3. Build RSS parser and processor
4. Create news API endpoints
5. Develop UI components
6. Test podcast generation with news integration

**See `/docs/NEWS_RSS_IMPLEMENTATION_PLAN.md` for complete technical details.**

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
