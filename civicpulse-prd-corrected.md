# 🎙️ CIVIC PULSE - COMPREHENSIVE PRODUCT REQUIREMENTS DOCUMENT (PRD) v2.1

**Version:** 2.1 (Implementation-Aligned Edition)
**Date:** October 26, 2025
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
5. [Database Schema (Raindrop SmartSQL - SQLite)](#5-database-schema-raindrop-smartsql-sqlite)
6. [API Integrations](#6-api-integrations)
7. [Feature Specifications](#7-feature-specifications)
8. [Podcast System (Daily + Weekly)](#8-podcast-system-daily--weekly)
9. [User Experience & Design](#9-user-experience--design)
10. [Voice Agent Implementation](#10-voice-agent-implementation)
11. [Responsive Design Requirements](#11-responsive-design-requirements)
12. [Payment & Monetization](#12-payment--monetization)
13. [Hackathon Implementation Timeline](#13-hackathon-implementation-timeline)
14. [Competition Category Alignment](#14-competition-category-alignment)
15. [Deployment Strategy](#15-deployment-strategy)

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
- **Interactive Dashboard**: Bill tracking, rep profiles, voting records
- **Action Tools**: Direct contact with representatives
- **Transparent**: Uses actual Congressional Record speeches

### 1.4 Unique Value Propositions

1. **Dual Podcast Format**: Quick daily updates + deep weekly analysis
2. **Authenticity**: Uses actual Congressional Record speeches
3. **Personalization**: Your representatives, your issues, your community
4. **Professional Quality**: NPR-style production with dual hosts
5. **Launch-Ready**: Full authentication, payment processing, scalable infrastructure

### 1.5 Hackathon Innovation

- Built entirely using **Claude Code** on **Raindrop Platform**
- **Raindrop SmartSQL (SQLite)** for intelligent data management
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
- Integrates Raindrop SmartSQL, SmartBuckets, SmartMemory

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

- **SmartSQL**: SQLite database with natural language query capabilities
- **SmartBuckets**: RAG-enabled document storage with semantic search
- **SmartMemory**: Multi-layer memory system (working, episodic, semantic, procedural)
- **AI Models**: Direct access via `env.AI.run()` for Claude and other models

✅ **Deploy backend services on Raindrop**

- All API routes on Raindrop
- Database on Raindrop SmartSQL (SQLite)
- Document storage on Raindrop SmartBuckets
- Audio storage on Vultr Object Storage

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

**CRITICAL: Uses Actual Raindrop MCP Tool Patterns (Not Fictional SDK)**

```typescript
// CORRECT: Using actual Raindrop MCP tools
import { mcp } from '@raindrop/mcp';

// SmartSQL - SQLite with natural language queries
const bills = await mcp.sql.executeQuery({
  database_id: 'civic-pulse-db',
  query: `
    SELECT * FROM bills
    WHERE has_full_text = 1
    AND impact_score >= 60
    ORDER BY latest_action_date DESC
    LIMIT 10
  `
});

// SmartBuckets - RAG-enabled document search
const relevantDocs = await mcp.buckets.search({
  bucket_name: 'congressional-documents',
  query: 'healthcare reform provisions',
  limit: 5,
  threshold: 0.7
});

// SmartMemory - Working memory for user sessions
await mcp.memory.putMemory({
  session_id: userId,
  content: JSON.stringify({ preferences: userInterests }),
  key: 'user-preferences',
  timeline: 'current-session'
});

// AI Models - Direct access (no SmartInference wrapper)
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
│  │      Raindrop Smart Components                   │   │
│  │  • SmartSQL (SQLite)                            │   │
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
  - SmartSQL (SQLite with natural language queries)
  - SmartBuckets (RAG-enabled document storage)
  - SmartMemory (Multi-layer memory system)
  - AI Models (Direct access via env.AI.run())

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

## 5. DATABASE SCHEMA (RAINDROP SMARTSQL - SQLite)

**CORRECTED: SQLite-compatible schema with idempotent patterns**

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

### 5.2 Raindrop SmartSQL Usage (CORRECTED)

```ts
// lib/raindrop/smart-sql.ts

import { mcp } from '@raindrop/mcp';

const DATABASE_ID = 'civic-pulse-db';

// Execute SQL query
export async function getBills(params: {
  hasFullText?: boolean;
  minImpactScore?: number;
  limit?: number;
}) {
  const query = `
    SELECT * FROM bills
    WHERE has_full_text = ${params.hasFullText ? 1 : 0}
    AND impact_score >= ${params.minImpactScore || 0}
    ORDER BY latest_action_date DESC
    LIMIT ${params.limit || 10}
  `;

  const result = await mcp.sql.executeQuery({
    database_id: DATABASE_ID,
    query
  });

  return result.rows;
}

// Natural language query (SmartSQL feature)
export async function searchBillsNaturalLanguage(question: string) {
  const result = await mcp.sql.executeQuery({
    database_id: DATABASE_ID,
    query: question // SmartSQL converts natural language to SQL
  });

  return result.rows;
}

// Get database metadata
export async function getTableSchema(tableName?: string) {
  return await mcp.sql.getMetadata({
    database_id: DATABASE_ID,
    table_name: tableName
  });
}
```

---

## 6. API INTEGRATIONS

**CORRECTED: Using actual implementation patterns from nested claude.md files**

### 6.1 Congress.gov API (from lib/api/claude.md)

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

### 6.2 Claude Sonnet 4 API (CORRECTED: via env.AI.run())

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

### 6.3 ElevenLabs API (from lib/ai/claude.md)

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

### 6.4 WorkOS Authentication (CORRECTED)

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

### 6.5 Vultr Object Storage (CORRECTED: S3-compatible API)

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

## 7. FEATURE SPECIFICATIONS

### 7.1 User Onboarding (shadcn/ui)

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

### 7.2 Dashboard (shadcn/ui)

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

---

## 8. PODCAST SYSTEM (DAILY + WEEKLY)

### 8.1 Podcast Generation Pipeline (CORRECTED)

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

  // 1. Gather data from SmartSQL
  const userResult = await mcp.sql.executeQuery({
    database_id: 'civic-pulse-db',
    query: `SELECT * FROM users WHERE id = '${userId}'`
  });
  const userData = userResult.rows[0];

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
  await mcp.sql.executeQuery({
    database_id: 'civic-pulse-db',
    query: `
      INSERT INTO podcast_episodes (
        id, user_id, episode_type, title, audio_url,
        featured_bills, featured_representatives,
        generation_status, generation_duration_seconds
      ) VALUES (
        '${episodeId}', '${userId}', '${type}', '${script.title}',
        '${audioUrl}', '${JSON.stringify(bills.map(b => b.id))}',
        '${JSON.stringify(representatives.map(r => r.id))}',
        'completed', ${Math.floor((Date.now() - startTime) / 1000)}
      )
    `
  });

  return episodeId;
}
```

---

## 9. USER EXPERIENCE & DESIGN

Uses shadcn/ui components throughout for consistent, accessible design. All components are built with Radix UI primitives and styled with Tailwind CSS.

---

## 10. VOICE AGENT IMPLEMENTATION

**ElevenLabs text-to-dialogue endpoint** generates complete multi-host conversations in a single API call. This provides:
- Natural conversational flow
- Proper timing and pacing
- No manual audio stitching required
- Professional NPR-quality output

---

## 11. RESPONSIVE DESIGN REQUIREMENTS

- **Mobile-first**: Touch targets min 44x44px
- **Test breakpoints**: iPhone SE (375px), iPad (768px), Desktop (1920px)
- **Audio player**: Fixed at bottom on mobile with background playback support

---

## 12. PAYMENT & MONETIZATION

**Freemium Model:**

- **Free**: 1 weekly podcast, basic dashboard
- **Premium ($9.99/mo)**: Daily + weekly podcasts, unlimited tracking

**Stripe Integration** with webhook handlers for subscription management.

---

## 13. HACKATHON IMPLEMENTATION TIMELINE

### Critical Path (24 Hours)
1. ✅ Setup (3hrs): Raindrop + Vultr + API keys
2. ✅ Database & APIs (4hrs): SmartSQL schema + Congress.gov client
3. ✅ Authentication (4hrs): WorkOS integration
4. ✅ Podcast Generation (5hrs): Claude + ElevenLabs + Vultr upload
5. ✅ Dashboard UI (4hrs): shadcn/ui components
6. ✅ Payments (2hrs): Stripe checkout
7. ✅ Polish & Deploy (2hrs): Testing + deployment

---

## 14. COMPETITION CATEGORY ALIGNMENT

### 14.1 Best Voice Agent
- Sophisticated dual-voice system (Sarah + James)
- ElevenLabs text-to-dialogue integration
- Dual format (daily 5-7min + weekly 15-18min)
- NPR-quality production

### 14.2 Best AI Solution for Public Good
- Addresses civic disengagement crisis
- Claude Sonnet 4 for bill analysis
- Scalable to all 435 districts
- Non-partisan and transparent

---

## 15. DEPLOYMENT STRATEGY

### 15.1 Deployment Steps

1. **Deploy to Raindrop Platform** (serverless)
2. **Configure Vultr Object Storage** (S3-compatible)
3. **Set up WorkOS authentication**
4. **Configure Stripe webhooks**
5. **Test end-to-end flow**

### 15.2 Environment Variables

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

## END OF PRD v2.1

**Document Version:** 2.1 (Implementation-Aligned Edition)
**Last Updated:** October 26, 2025
**Platform:** Raindrop Platform + Vultr Object Storage + Next.js 16
**Competition:** Liquid Metal Hackathon
**Categories:** Best Voice Agent, Best AI Solution for Public Good

**✅ ALIGNED WITH ACTUAL RAINDROP CAPABILITIES**
**✅ USES CORRECT IMPLEMENTATION PATTERNS**
**✅ FOLLOWS CLAUDE.MD RULES**

**Key Corrections Applied:**
- ✅ SQLite schema (not PostgreSQL)
- ✅ WorkOS authentication (not "Raindrop Auth")
- ✅ Actual MCP tool patterns (not fictional SDK)
- ✅ Direct env.AI.run() (no SmartInference wrapper)
- ✅ ElevenLabs text-to-dialogue (from lib/ai/claude.md)
- ✅ Congress.gov implementation (from lib/api/claude.md)
- ✅ Vultr Object Storage only (not Bare Metal)
- ✅ Fixed TTLs (24hr bills, 7 days members)

**Let's build this correctly! 🚀🎙️**
