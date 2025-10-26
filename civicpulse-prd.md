# 🎙️ CIVIC PULSE \- COMPREHENSIVE PRODUCT REQUIREMENTS DOCUMENT (PRD) v2.0

**Version:** 2.0 (Hackathon Edition)  
**Date:** October 24, 2025  
**Project Type:** Liquid Metal Hackathon Submission  
**Target Categories:** Best Voice Agent, Best AI Solution for Public Good  
**Tech Stack:** Next.js 16, Raindrop Platform, Vultr, ElevenLabs, Claude Sonnet 4, shadcn/ui

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#1.-executive-summary)  
2. [Hackathon Requirements Compliance](#2.-hackathon-requirements-compliance)  
3. [Product Vision](#3.-product-vision)  
4. [Technical Architecture](#4.-technical-architecture)  
5. [Database Schema (Raindrop SmartSQL)](#5.-database-schema-\(raindrop-smartsql\))  
6. [API Integrations](#6.-api-integrations)  
7. [Feature Specifications](#7.-feature-specifications)  
8. [Podcast System (Daily \+ Weekly)](#8.-podcast-system-\(daily-+-weekly\))  
9. [User Experience & Design](#user-experience-design)  
10. [Voice Agent Implementation](#voice-agent-implementation)  
11. [Committee Video Integration](#committee-video-integration)  
12. [Responsive Design Requirements](#responsive-design-requirements)  
13. [Payment & Monetization](#9.-payment-&-monetization)  
14. [Hackathon Implementation Timeline](#10.-hackathon-implementation-timeline)  
15. [Competition Category Alignment](#11.-competition-category-alignment)  
16. [Deployment Strategy](#12.-deployment-strategy)

---

## 1\. EXECUTIVE SUMMARY {#1.-executive-summary}

### 1.1 Product Overview

**Civic Pulse** is an AI-powered civic engagement platform that transforms complex Congressional legislation into personalized audio briefings and interactive dashboards. Built on the Raindrop Platform with Vultr infrastructure, Civic Pulse delivers professional NPR-quality podcasts (daily 5-minute briefings \+ weekly 15-minute deep dives) using ElevenLabs voice generation and Claude Sonnet 4 AI analysis.

### 1.2 The Problem

- **75%** of Americans cannot name their representative  
- Congressional bills average **30+ pages** of legal jargon  
- **Civic disengagement** is at historic lows  
- **Time poverty** \- people need quick, digestible updates  
- **Misinformation** thrives due to inaccessible legislation

### 1.3 The Solution

**Two-Tier Audio System:**

- **Daily Brief**: 5-7 minute morning update (NYT Daily style)  
- **Weekly Deep Dive**: 15-18 minute comprehensive analysis (NPR style)  
- **Interactive Dashboard**: Bill tracking, rep profiles, voting records  
- **Action Tools**: Direct contact with representatives  
- **Transparent**: Uses actual Congressional Record speeches

### 1.4 Unique Value Propositions

1. **Dual Podcast Format**: Quick daily updates \+ deep weekly analysis  
2. **Authenticity**: Uses actual Congressional Record speeches  
3. **Personalization**: Your representatives, your issues, your community  
4. **Professional Quality**: NPR-style production with dual hosts  
5. **Launch-Ready**: Full authentication, payment processing, scalable infrastructure

### 1.5 Hackathon Innovation

- Built entirely using **Claude Code** on **Raindrop Platform**  
- **Raindrop Smart Components** for intelligent data management  
- **Vultr Edge Computing** for low-latency audio delivery  
- **ElevenLabs** for professional voice generation  
- **Production-ready** with Stripe payments and user authentication

---

## 2\. HACKATHON REQUIREMENTS COMPLIANCE {#2.-hackathon-requirements-compliance}

### 2.1 Core Requirements Checklist

✅ **Working AI application built on Raindrop Platform**

- Backend deployed on Raindrop  
- Uses Raindrop MCP Server for all data operations  
- Integrates all Raindrop Smart Components

✅ **Must use AI coding assistant**

- **Primary**: Claude Code (via Raindrop MCP)  
- **Backup**: Gemini CLI  
- All code generation logged and documented

✅ **Must integrate at least one Vultr service**

- **Vultr Bare Metal Cloud**: API processing and podcast generation  
- **Vultr Object Storage**: Audio file CDN  
- **Vultr Load Balancer**: Handle traffic spikes  
- **Vultr DDoS Protection**: Security

✅ **Projects newly created during hackathon**

- Greenfield project, all code written during event  
- Git history shows progressive development  
- Commit timestamps within hackathon window

✅ **Voice Agent Category: Must integrate ElevenLabs**

- Dual-voice system (Sarah \+ James)  
- Professional NPR-quality audio  
- Daily \+ weekly podcast generation

✅ **Utilize Raindrop Smart Components**

- **SmartSQL**: PostgreSQL database with AI optimization  
- **SmartBuckets**: Intelligent audio file storage  
- **SmartMemory**: User preference caching  
- **SmartInference**: AI model routing (Claude \+ ElevenLabs)

✅ **Deploy backend services on Raindrop**

- All API routes on Raindrop  
- Database on Raindrop SmartSQL  
- Storage on Raindrop SmartBuckets

✅ **Enhance with Vultr service**

- Vultr CDN for audio delivery  
- Vultr compute for heavy processing  
- Vultr security for production readiness

✅ **Application functions consistently**

- Comprehensive testing suite  
- Demo video shows full user flow  
- Error handling and graceful degradation

✅ **Launch-ready quality**

- **Authentication**: Raindrop Auth \+ Social OAuth  
- **Payments**: Stripe integration (Freemium model)  
- **Security**: Rate limiting, DDoS protection  
- **Monitoring**: Error tracking, analytics  
- **Performance**: \<2s page loads, \<60s podcast generation

### 2.2 Raindrop Smart Components Integration

```javascript
// Example: Using Raindrop SmartSQL
import { SmartSQL } from '@raindrop/smart-sql';

const db = new SmartSQL({
  connection: process.env.RAINDROP_SQL_URL,
  aiOptimization: true, // AI-powered query optimization
  caching: 'intelligent' // Smart caching based on access patterns
});

// AI automatically optimizes this query
const bills = await db.bills.findMany({
  where: {
    issueCategories: { contains: userInterests },
    hasFullText: true
  },
  orderBy: { impactScore: 'desc' },
  limit: 10
});

// Example: Using Raindrop SmartBuckets
import { SmartBuckets } from '@raindrop/smart-buckets';

const storage = new SmartBuckets({
  bucket: 'civic-pulse-audio',
  cdn: true, // Automatic CDN distribution
  compression: 'adaptive', // AI-powered compression
  vultrIntegration: true // Use Vultr for edge delivery
});

await storage.upload({
  key: `podcasts/${userId}/${episodeId}.mp3`,
  file: audioBuffer,
  metadata: {
    duration: episodeDuration,
    quality: 'high',
    format: 'mp3'
  }
});

// Example: Using Raindrop SmartMemory
import { SmartMemory } from '@raindrop/smart-memory';

const cache = new SmartMemory({
  ttl: 'adaptive', // AI determines optimal TTL
  invalidation: 'intelligent' // Smart cache invalidation
});

// Cache user's representatives with smart TTL
await cache.set(`reps:${userId}`, representatives, {
  tags: ['user-data', 'representatives'],
  autoInvalidate: ['user-profile-updated', 'rep-data-changed']
});

// Example: Using Raindrop SmartInference
import { SmartInference } from '@raindrop/smart-inference';

const ai = new SmartInference({
  providers: {
    textAnalysis: 'anthropic/claude-sonnet-4',
    voiceGeneration: 'elevenlabs/eleven_monolingual_v1'
  },
  routing: 'cost-optimized', // Route to best provider
  fallback: true // Automatic failover
});

const analysis = await ai.analyze({
  model: 'claude-sonnet-4',
  input: billFullText,
  task: 'legislative-analysis'
});
```

### 2.3 Vultr Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT LAYER                           │
│              (Next.js 16 Frontend)                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              VULTR LOAD BALANCER                         │
│         (DDoS Protection + SSL Termination)              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              RAINDROP PLATFORM                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Next.js 16 API Routes                    │   │
│  │  (Deployed on Raindrop Edge Functions)          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │      Raindrop Smart Components                   │   │
│  │  • SmartSQL (PostgreSQL)                        │   │
│  │  • SmartBuckets (File Storage)                  │   │
│  │  • SmartMemory (Caching)                        │   │
│  │  • SmartInference (AI Routing)                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│         VULTR BARE METAL COMPUTE                         │
│  (Heavy Processing: Podcast Generation, AI Analysis)    │
│                                                          │
│  • Bill Analysis Pipeline                               │
│  • Congressional Record Processing                       │
│  • Audio Generation & Mixing                            │
│  • Video Processing (Committee hearings)                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│         VULTR OBJECT STORAGE + CDN                       │
│  (Audio Files, Images, Static Assets)                   │
│                                                          │
│  • Global CDN distribution                              │
│  • Low-latency audio delivery                           │
│  • 99.99% uptime SLA                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 3\. PRODUCT VISION {#3.-product-vision}

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

## 4\. TECHNICAL ARCHITECTURE {#4.-technical-architecture}

### 4.1 System Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    CLIENT TIER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Web App    │  │  Mobile Web  │  │  Future PWA  │   │
│  │  (Next.js 16)│  │ (Responsive) │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└───────────────────────────────────────────────────────────┘
                           ↓
┌───────────────────────────────────────────────────────────┐
│                  APPLICATION TIER                          │
│              (Raindrop Edge Functions)                     │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │           Next.js 16 API Routes                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────┐   │  │
│  │  │  Auth    │ │  Bills   │ │  Podcast Gen    │   │  │
│  │  │ Handler  │ │ Analyzer │ │    Service      │   │  │
│  │  └──────────┘ └──────────┘ └─────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
                           ↓
┌───────────────────────────────────────────────────────────┐
│               RAINDROP SMART COMPONENTS                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ SmartSQL   │ │SmartBuckets│ │  SmartInference    │   │
│  │(PostgreSQL)│ │  (Storage) │ │  (AI Routing)      │   │
│  └────────────┘ └────────────┘ └────────────────────┘   │
│  ┌────────────┐                                          │
│  │SmartMemory │                                          │
│  │ (Caching)  │                                          │
│  └────────────┘                                          │
└───────────────────────────────────────────────────────────┘
                           ↓
┌───────────────────────────────────────────────────────────┐
│                 EXTERNAL SERVICES                          │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │
│  │Congress.gov │ │  Anthropic  │ │   ElevenLabs     │   │
│  │     API     │ │Claude Sonnet│ │   Voice API      │   │
│  └─────────────┘ └─────────────┘ └──────────────────┘   │
│  ┌─────────────┐ ┌─────────────┐                        │
│  │   Stripe    │ │   Geocoding │                        │
│  │  Payments   │ │     API     │                        │
│  └─────────────┘ └─────────────┘                        │
└───────────────────────────────────────────────────────────┘
                           ↓
┌───────────────────────────────────────────────────────────┐
│                    VULTR TIER                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │         Vultr Bare Metal Compute                    │  │
│  │  • Heavy processing (podcast generation)           │  │
│  │  • AI analysis pipeline                            │  │
│  │  • Audio mixing                                    │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │         Vultr Object Storage + CDN                  │  │
│  │  • Audio file delivery                             │  │
│  │  • Global edge caching                             │  │
│  │  • Low-latency streaming                           │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### 4.2 Tech Stack (Updated)

**Frontend:**

- **Framework**: Next.js 16 (App Router with Turbopack)  
- **UI Library**: React 19  
- **Component Library**: shadcn/ui (Radix UI primitives)  
- **Styling**: Tailwind CSS v4  
- **State Management**: React Context \+ Zustand  
- **Audio Player**: React Player \+ Howler.js  
- **Charts**: Recharts  
- **Icons**: Lucide React  
- **Forms**: React Hook Form \+ Zod validation

**Backend & Infrastructure:**

- **Platform**: Raindrop (Primary)  
    
  - SmartSQL (PostgreSQL with AI optimization)  
  - SmartBuckets (Intelligent file storage)  
  - SmartMemory (Adaptive caching)  
  - SmartInference (AI model routing)  
  - Edge Functions (API routes)


- **Compute**: Vultr Bare Metal Cloud  
    
  - Heavy processing workloads  
  - Podcast generation pipeline  
  - Video processing


- **Storage & CDN**: Vultr Object Storage  
    
  - Audio file delivery  
  - Static assets  
  - Global CDN distribution

**AI Services:**

- **Text Analysis**: Claude Sonnet 4 (via Raindrop SmartInference)  
- **Voice Generation**: ElevenLabs API (via Raindrop SmartInference)  
- **Model Routing**: Raindrop SmartInference (cost optimization)

**External APIs:**

- **Congress.gov API**: Legislative data  
- **Geocoding API**: Zip to congressional district  
- **Stripe API**: Payment processing

**DevOps:**

- **Hosting**: Raindrop Edge (primary) \+ Vultr (compute)  
- **CI/CD**: GitHub Actions  
- **Monitoring**: Raindrop Analytics \+ Sentry  
- **Load Balancing**: Vultr Load Balancer  
- **Security**: Vultr DDoS Protection

### 4.3 Next.js 16 Features Utilized

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
  
  // Enhanced caching
  cacheHandlers: {
    default: 'raindrop-smart-cache',
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vultr-cdn.civicpulse.com',
      },
    ],
  },
};

export default config;
```

**Key Next.js 16 Features:**

1. **Turbopack** \- 10x faster builds  
2. **React 19 Compiler** \- Automatic memoization  
3. **Partial Prerendering** \- Fast initial load  
4. **Enhanced Caching** \- Better performance  
5. **Server Actions** \- Simplified data mutations

### 4.4 shadcn/ui Integration

```ts
// components/ui/button.tsx (shadcn/ui)
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Usage throughout app
import { Button } from "@/components/ui/button"

<Button variant="default" size="lg">
  Play Episode
</Button>
```

**shadcn/ui Components Used:**

- Button, Card, Dialog, Dropdown Menu  
- Input, Label, Select, Slider  
- Tabs, Toast, Tooltip, Separator  
- Progress, Badge, Avatar, Skeleton  
- Sheet, Popover, Alert, Accordion

---

## 5\. DATABASE SCHEMA (RAINDROP SMARTSQL) {#5.-database-schema-(raindrop-smartsql)}

### 5.1 Core Tables

```sql
-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  
  -- Authentication (Raindrop Auth)
  auth_provider TEXT DEFAULT 'email', -- 'email', 'google', 'apple'
  auth_provider_id TEXT,
  email_verified BOOLEAN DEFAULT false,
  
  -- Location
  zip_code TEXT NOT NULL,
  congressional_district TEXT,
  state TEXT,
  city TEXT,
  
  -- Preferences
  interests TEXT[] NOT NULL, -- Array of interest categories
  podcast_frequency TEXT DEFAULT 'both', -- 'daily', 'weekly', 'both', 'ondemand'
  daily_time TIME DEFAULT '07:00:00', -- When to deliver daily brief
  podcast_length_preference TEXT DEFAULT 'standard',
  delivery_day TEXT DEFAULT 'friday', -- For weekly
  
  -- Notifications
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  
  -- Subscription (Stripe)
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'premium'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_expires_at TIMESTAMPTZ,
  
  -- Engagement
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  streak_days INTEGER DEFAULT 0,
  total_episodes_listened INTEGER DEFAULT 0,
  total_actions_taken INTEGER DEFAULT 0, -- Contacted reps, shared, etc.
  
  -- AI Optimization (Raindrop SmartSQL)
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes (SmartSQL auto-optimizes based on usage)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_zip ON users(zip_code);
CREATE INDEX idx_users_subscription ON users(subscription_tier, subscription_expires_at);

-- ============================================================================
-- REPRESENTATIVES TABLE
-- ============================================================================
CREATE TABLE representatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  committees TEXT[],
  term_start DATE,
  term_end DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Caching (SmartMemory integration)
  cache_expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reps_bioguide ON representatives(bioguide_id);
CREATE INDEX idx_reps_state_district ON representatives(state, district);
CREATE INDEX idx_reps_active ON representatives(is_active) WHERE is_active = true;

-- ============================================================================
-- BILLS TABLE
-- ============================================================================
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congress INTEGER NOT NULL,
  bill_type TEXT NOT NULL,
  bill_number INTEGER NOT NULL,
  full_bill_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  official_title TEXT,
  
  -- Dates
  introduced_date DATE,
  latest_action_date DATE,
  latest_action_text TEXT,
  
  -- Sponsor
  sponsor_bioguide_id TEXT REFERENCES representatives(bioguide_id),
  sponsor_name TEXT,
  sponsor_party TEXT,
  sponsor_state TEXT,
  
  -- Status
  status TEXT,
  is_enacted BOOLEAN DEFAULT false,
  
  -- Content
  has_full_text BOOLEAN DEFAULT false,
  full_text_url TEXT,
  summary_short TEXT,
  summary_detailed TEXT,
  
  -- AI Analysis (Claude via SmartInference)
  plain_english_summary TEXT,
  key_provisions JSONB,
  affected_groups JSONB,
  issue_categories TEXT[],
  complexity_score INTEGER CHECK (complexity_score BETWEEN 1 AND 10),
  controversy_level TEXT CHECK (controversy_level IN ('high', 'medium', 'low')),
  estimated_cost TEXT,
  title_accuracy_check TEXT,
  local_impact JSONB,
  ai_analysis_version INTEGER DEFAULT 1,
  
  -- Metrics
  cosponsor_count INTEGER DEFAULT 0,
  is_bipartisan BOOLEAN DEFAULT false,
  impact_score FLOAT CHECK (impact_score BETWEEN 0 AND 100),
  
  -- Congressional Record
  has_floor_speeches BOOLEAN DEFAULT false,
  floor_speech_count INTEGER DEFAULT 0,
  
  -- Caching
  cache_expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(congress, bill_type, bill_number)
);

CREATE INDEX idx_bills_full_id ON bills(full_bill_id);
CREATE INDEX idx_bills_categories ON bills USING GIN(issue_categories);
CREATE INDEX idx_bills_impact ON bills(impact_score DESC) WHERE has_full_text = true;
CREATE INDEX idx_bills_latest_action ON bills(latest_action_date DESC);

-- ============================================================================
-- PODCAST EPISODES TABLE (Daily + Weekly)
-- ============================================================================
CREATE TABLE podcast_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Episode info
  episode_type TEXT NOT NULL CHECK (episode_type IN ('daily', 'weekly')),
  title TEXT NOT NULL,
  description TEXT,
  episode_date DATE NOT NULL,
  duration INTEGER, -- seconds
  
  -- Audio (Raindrop SmartBuckets + Vultr CDN)
  audio_url TEXT NOT NULL, -- Vultr CDN URL
  audio_bucket_key TEXT, -- SmartBuckets key
  audio_size_bytes BIGINT,
  transcript TEXT,
  
  -- Content references
  featured_bills UUID[] NOT NULL,
  featured_representatives UUID[] NOT NULL,
  
  -- Script (stored for debugging)
  script_json JSONB,
  
  -- Generation metadata
  generation_status TEXT DEFAULT 'pending' CHECK (
    generation_status IN ('pending', 'processing', 'completed', 'failed')
  ),
  generation_started_at TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  generation_duration_seconds INTEGER,
  error_message TEXT,
  
  -- AI models used (SmartInference tracking)
  claude_model TEXT DEFAULT 'claude-sonnet-4-20250514',
  elevenlabs_model TEXT DEFAULT 'eleven_monolingual_v1',
  total_ai_cost_cents INTEGER, -- Track costs
  
  -- Engagement
  listen_count INTEGER DEFAULT 0,
  completion_rate FLOAT CHECK (completion_rate BETWEEN 0 AND 1),
  share_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- SmartSQL optimization
  CONSTRAINT unique_user_date_type UNIQUE(user_id, episode_date, episode_type)
);

CREATE INDEX idx_episodes_user_type ON podcast_episodes(user_id, episode_type);
CREATE INDEX idx_episodes_date ON podcast_episodes(episode_date DESC);
CREATE INDEX idx_episodes_status ON podcast_episodes(generation_status) 
  WHERE generation_status IN ('pending', 'processing');

-- ============================================================================
-- LISTENING HISTORY TABLE
-- ============================================================================
CREATE TABLE listening_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  
  -- Listening data
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_position INTEGER DEFAULT 0, -- seconds
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- Device info
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  browser TEXT,
  
  UNIQUE(user_id, episode_id)
);

CREATE INDEX idx_history_user ON listening_history(user_id);
CREATE INDEX idx_history_completed ON listening_history(completed, completed_at DESC);

-- ============================================================================
-- VOTES TABLE
-- ============================================================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  vote_number INTEGER NOT NULL,
  chamber TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
  vote_date DATE NOT NULL,
  vote_question TEXT,
  vote_result TEXT,
  vote_type TEXT,
  
  -- Tallies
  yea_total INTEGER,
  nay_total INTEGER,
  present_total INTEGER,
  not_voting_total INTEGER,
  
  -- Party breakdown
  dem_yea INTEGER,
  dem_nay INTEGER,
  rep_yea INTEGER,
  rep_nay INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(chamber, vote_number, vote_date)
);

CREATE INDEX idx_votes_bill ON votes(bill_id);
CREATE INDEX idx_votes_date ON votes(vote_date DESC);

-- ============================================================================
-- REPRESENTATIVE VOTES TABLE
-- ============================================================================
CREATE TABLE representative_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
  representative_id UUID REFERENCES representatives(id),
  vote_position TEXT NOT NULL CHECK (
    vote_position IN ('Yea', 'Nay', 'Present', 'Not Voting')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(vote_id, representative_id)
);

CREATE INDEX idx_rep_votes_vote ON representative_votes(vote_id);
CREATE INDEX idx_rep_votes_rep ON representative_votes(representative_id);

-- ============================================================================
-- CONGRESSIONAL RECORD SPEECHES TABLE
-- ============================================================================
CREATE TABLE congressional_record_speeches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  speaker_bioguide_id TEXT REFERENCES representatives(bioguide_id),
  speaker_name TEXT NOT NULL,
  speech_date DATE NOT NULL,
  chamber TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
  section TEXT,
  
  -- Content
  full_text TEXT NOT NULL,
  excerpt TEXT, -- AI-extracted best quote
  stance TEXT CHECK (stance IN ('supportive', 'opposing', 'neutral')),
  
  -- Metadata
  volume INTEGER,
  issue INTEGER,
  page_start TEXT,
  
  -- AI analysis
  key_quotes JSONB, -- Array of important quotes
  sentiment_score FLOAT, -- -1 to 1
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cr_bill ON congressional_record_speeches(bill_id);
CREATE INDEX idx_cr_speaker ON congressional_record_speeches(speaker_bioguide_id);
CREATE INDEX idx_cr_date ON congressional_record_speeches(speech_date DESC);

-- ============================================================================
-- COMMITTEE MEETINGS TABLE (Video Integration)
-- ============================================================================
CREATE TABLE committee_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congress INTEGER NOT NULL,
  chamber TEXT NOT NULL CHECK (chamber IN ('house', 'senate', 'joint')),
  committee_code TEXT NOT NULL,
  committee_name TEXT NOT NULL,
  
  -- Meeting details
  meeting_date TIMESTAMPTZ NOT NULL,
  meeting_title TEXT NOT NULL,
  meeting_description TEXT,
  location TEXT,
  
  -- Video (Vultr CDN)
  has_video BOOLEAN DEFAULT false,
  video_url TEXT,
  video_cdn_url TEXT, -- Vultr CDN
  video_thumbnail_url TEXT,
  video_duration INTEGER,
  
  -- Associated bills
  related_bills UUID[],
  
  -- AI-generated summary (Claude via SmartInference)
  ai_summary TEXT,
  key_topics TEXT[],
  key_timestamps JSONB, -- [{time: "00:15:32", topic: "..."}]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meetings_date ON committee_meetings(meeting_date DESC);
CREATE INDEX idx_meetings_committee ON committee_meetings(committee_code);
CREATE INDEX idx_meetings_has_video ON committee_meetings(has_video) WHERE has_video = true;

-- ============================================================================
-- USER TRACKED BILLS TABLE
-- ============================================================================
CREATE TABLE user_tracked_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  tracked_at TIMESTAMPTZ DEFAULT NOW(),
  notifications_enabled BOOLEAN DEFAULT true,
  
  UNIQUE(user_id, bill_id)
);

CREATE INDEX idx_tracked_user ON user_tracked_bills(user_id);
CREATE INDEX idx_tracked_bill ON user_tracked_bills(bill_id);

-- ============================================================================
-- USER ACTIONS TABLE (Analytics)
-- ============================================================================
CREATE TABLE user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'contacted_rep', 'shared_episode', 'tracked_bill', 
    'voted_feedback', 'upgraded_premium', 'referral'
  )),
  action_target_type TEXT,
  action_target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_actions_user ON user_actions(user_id);
CREATE INDEX idx_actions_type ON user_actions(action_type);
CREATE INDEX idx_actions_date ON user_actions(created_at DESC);

-- ============================================================================
-- ALIGNMENT SCORES TABLE (Cached calculations)
-- ============================================================================
CREATE TABLE alignment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  representative_id UUID REFERENCES representatives(id) ON DELETE CASCADE,
  
  -- Calculated alignment (0-100)
  overall_score FLOAT CHECK (overall_score BETWEEN 0 AND 100),
  
  -- By issue category
  scores_by_issue JSONB,
  
  -- Calculation metadata
  bills_analyzed INTEGER,
  votes_analyzed INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- SmartMemory integration
  
  UNIQUE(user_id, representative_id)
);

CREATE INDEX idx_alignment_user ON alignment_scores(user_id);
CREATE INDEX idx_alignment_rep ON alignment_scores(representative_id);
CREATE INDEX idx_alignment_expires ON alignment_scores(expires_at);

-- ============================================================================
-- PAYMENT TRANSACTIONS TABLE (Stripe)
-- ============================================================================
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Stripe info
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  
  -- Transaction details
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'succeeded', 'failed', 'refunded'
  )),
  
  -- Subscription info
  subscription_tier TEXT,
  billing_period_start DATE,
  billing_period_end DATE,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON payment_transactions(user_id);
CREATE INDEX idx_transactions_stripe ON payment_transactions(stripe_payment_intent_id);
CREATE INDEX idx_transactions_status ON payment_transactions(status, created_at DESC);

-- ============================================================================
-- SYSTEM CONFIG TABLE
-- ============================================================================
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configs
INSERT INTO system_config (key, value, description) VALUES
('interest_categories', '["Healthcare", "Housing", "Climate", "Education", "Economy", "Immigration", "Defense", "Technology", "Justice", "Agriculture", "Veterans", "Trade"]', 'Available interest categories'),
('podcast_daily_length', '{"target_minutes": 6, "max_minutes": 8}', 'Daily podcast length targets'),
('podcast_weekly_length', '{"target_minutes": 16, "max_minutes": 20}', 'Weekly podcast length targets'),
('impact_score_weights', '{"cosponsor_count": 0.3, "bipartisan": 0.2, "stage": 0.3, "user_interest_match": 0.2}', 'Bill impact score calculation'),
('subscription_tiers', '{"free": {"daily_limit": 1, "weekly_limit": 1}, "premium": {"daily_limit": null, "weekly_limit": null, "price_cents": 999}}', 'Subscription tier limits');
```

### 5.2 Raindrop SmartSQL Features

```ts
// lib/raindrop/smart-sql.ts

import { SmartSQL } from '@raindrop/smart-sql';

export const db = new SmartSQL({
  connection: process.env.RAINDROP_SQL_URL!,
  
  // AI-powered query optimization
  aiOptimization: {
    enabled: true,
    learningMode: 'adaptive', // Learns from query patterns
    autoIndexing: true, // Creates indexes automatically
  },
  
  // Intelligent caching
  caching: {
    strategy: 'intelligent', // AI determines what to cache
    ttl: 'adaptive', // Cache duration based on data volatility
    invalidation: 'smart', // Invalidates when data changes
  },
  
  // Query performance monitoring
  monitoring: {
    slowQueryThreshold: 1000, // ms
    autoOptimizeSlow: true,
    alertOnPerformance: true,
  },
});

// Example: AI-optimized query
async function getFeaturedBills(userId: string) {
  // SmartSQL automatically:
  // 1. Optimizes the query plan
  // 2. Creates necessary indexes
  // 3. Caches results intelligently
  // 4. Monitors performance
  
  return db.bills.findMany({
    where: {
      hasFullText: true,
      issueCategories: {
        overlaps: user.interests,
      },
      impactScore: { gte: 60 },
    },
    include: {
      sponsor: true,
      votes: {
        where: {
          chamber: 'house',
        },
        orderBy: { voteDate: 'desc' },
        take: 1,
      },
    },
    orderBy: [
      { impactScore: 'desc' },
      { latestActionDate: 'desc' },
    ],
    take: 5,
  });
}
```

### 5.3 Raindrop SmartBuckets (Storage)

```ts
// lib/raindrop/smart-buckets.ts

import { SmartBuckets } from '@raindrop/smart-buckets';

export const storage = new SmartBuckets({
  bucket: 'civic-pulse-audio',
  
  // Vultr CDN integration
  cdn: {
    enabled: true,
    provider: 'vultr',
    regions: ['us-east', 'us-west', 'eu-central'],
    caching: 'aggressive',
  },
  
  // AI-powered compression
  compression: {
    strategy: 'adaptive', // AI chooses best compression
    quality: 'high',
    audioOptimization: true, // Special handling for audio
  },
  
  // Automatic optimization
  optimization: {
    autoConvert: true, // Convert to best format
    thumbnail Generation: true, // For video
    metadata Extraction: true,
  },
});

// Upload podcast with automatic optimization
async function uploadPodcast(
  userId: string,
  episodeId: string,
  audioBuffer: Buffer
) {
  const result = await storage.upload({
    key: `podcasts/${userId}/${episodeId}.mp3`,
    file: audioBuffer,
    metadata: {
      contentType: 'audio/mpeg',
      userId,
      episodeId,
    },
    options: {
      // SmartBuckets automatically:
      // 1. Optimizes audio quality vs. size
      // 2. Distributes to Vultr CDN
      // 3. Generates waveform visualization
      // 4. Creates adaptive bitrate versions
      optimize: true,
      cdn: true,
      generateWaveform: true,
      adaptiveBitrate: ['192k', '128k', '64k'],
    },
  });
  
  // Returns CDN URL
  return result.cdnUrl;
}
```

---

## 6\. API INTEGRATIONS {#6.-api-integrations}

### 6.1 Congress.gov API

**Wrapped with Raindrop SmartInference for caching/optimization**

```ts
// lib/api/congress.ts

import { SmartInference } from '@raindrop/smart-inference';

export class CongressAPI {
  private baseURL = 'https://api.congress.gov/v3';
  private apiKey = process.env.CONGRESS_API_KEY!;
  private ai = new SmartInference({
    caching: true,
    rateLimit: {
      maxRequests: 5000,
      window: '1h',
    },
  });
  
  async getBills(params: BillSearchParams) {
    // SmartInference automatically caches and rate limits
    return this.ai.callAPI({
      provider: 'rest',
      endpoint: `${this.baseURL}/bill`,
      params: {
        congress: params.congress,
        limit: params.limit || 250,
        sort: 'updateDate+desc',
        ...params,
      },
      headers: {
        'X-Api-Key': this.apiKey,
      },
      cache: {
        ttl: '1h', // Cache for 1 hour
        key: `bills:${JSON.stringify(params)}`,
      },
    });
  }
  
  async getBillText(congress: number, billType: string, billNumber: number) {
    return this.ai.callAPI({
      provider: 'rest',
      endpoint: `${this.baseURL}/bill/${congress}/${billType}/${billNumber}/text`,
      headers: { 'X-Api-Key': this.apiKey },
      cache: {
        ttl: '24h', // Bill text rarely changes
      },
    });
  }
  
  async getCongressionalRecord(volume: number, issue: number) {
    return this.ai.callAPI({
      provider: 'rest',
      endpoint: `${this.baseURL}/daily-congressional-record/${volume}/${issue}/articles`,
      headers: { 'X-Api-Key': this.apiKey },
      cache: {
        ttl: '7d', // Congressional Record is permanent
      },
    });
  }
}
```

### 6.2 Claude Sonnet 4 API (via Raindrop SmartInference)

```ts
// lib/ai/claude.ts

import { SmartInference } from '@raindrop/smart-inference';

export class ClaudeAnalyzer {
  private ai = new SmartInference({
    providers: {
      'legislative-analysis': 'anthropic/claude-sonnet-4-20250514',
    },
    routing: 'cost-optimized',
    fallback: true,
  });
  
  async analyzeBill(billText: string, billMetadata: BillMetadata) {
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
  "controversy_level": "high/medium/low",
  "title_accuracy": "Does title match content?",
  "local_impact": {
    "urban": "...",
    "suburban": "...",
    "rural": "..."
  }
}
`;
    
    const result = await this.ai.complete({
      model: 'claude-sonnet-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      cache: {
        // Cache bill analysis for 7 days
        ttl: '7d',
        key: `bill-analysis:${billMetadata.fullBillId}`,
      },
    });
    
    return JSON.parse(result.content[0].text);
  }
  
  async generatePodcastScript(data: PodcastData) {
    const prompt = this.buildScriptPrompt(data);
    
    return this.ai.complete({
      model: 'claude-sonnet-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8000,
      temperature: 0.7, // More creative for script
    });
  }
}
```

### 6.3 ElevenLabs API (via Raindrop SmartInference)

```ts
// lib/ai/voice.ts

import { SmartInference } from '@raindrop/smart-inference';

export class VoiceGenerator {
  private ai = new SmartInference({
    providers: {
      'voice-generation': 'elevenlabs/eleven_monolingual_v1',
    },
    costTracking: true,
  });
  
  private VOICES = {
    HOST_1: {
      id: 'EXAVITQu4vr4xnSDxMaL',
      name: 'Sarah',
      settings: { stability: 0.5, similarity_boost: 0.75 },
    },
    HOST_2: {
      id: 'pNInz6obpgDQGcFmaJgB',
      name: 'James',
      settings: { stability: 0.6, similarity_boost: 0.8 },
    },
  };
  
  async generateSpeech(
    text: string,
    voice: 'HOST_1' | 'HOST_2',
    options?: VoiceOptions
  ) {
    const voiceConfig = this.VOICES[voice];
    
    const result = await this.ai.generateAudio({
      provider: 'elevenlabs',
      voice_id: voiceConfig.id,
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        ...voiceConfig.settings,
        ...options?.settings,
      },
      cache: false, // Don't cache voice generation
    });
    
    return {
      audio: result.audioBuffer,
      cost: result.cost, // SmartInference tracks cost
    };
  }
}
```

### 6.4 Stripe API (Payments)

```ts
// lib/payments/stripe.ts

import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia',
});

export async function createCheckoutSession(userId: string) {
  const session = await stripe.checkout.sessions.create({
    customer: user.stripeCustomerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: process.env.STRIPE_PREMIUM_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: {
      userId,
    },
  });
  
  return session;
}

export async function handleWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;
  }
}
```

---

## 7\. FEATURE SPECIFICATIONS {#7.-feature-specifications}

### 7.1 Core Features (MVP \- Hackathon)

#### 7.1.1 User Onboarding

**shadcn/ui Implementation:**

```ts
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

#### 7.1.2 Dashboard (shadcn/ui)

```ts
// app/dashboard/page.tsx

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlayCircle, Download, Share2 } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="container py-6 space-y-8">
      {/* Latest Episode */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Your Daily Brief</h2>
            <p className="text-muted-foreground">October 24, 2025 • 6 min</p>
          </div>
          <Badge>New</Badge>
        </div>
        
        <AudioPlayer episodeId={latestEpisode.id} />
        
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
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
          <TabsTrigger value="tracked">Tracked Bills</TabsTrigger>
        </TabsList>
        
        <TabsContent value="action">
          <BillsList bills={actionableBills} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

## 8\. PODCAST SYSTEM (DAILY \+ WEEKLY) {#8.-podcast-system-(daily-+-weekly)}

### 8.1 Dual Podcast Format

**Daily Brief (5-7 minutes)**

- Morning delivery (user-specified time)  
- Top 2-3 urgent items  
- Quick updates on tracked bills  
- One key vote or action  
- Format: Fast-paced, energetic

**Weekly Deep Dive (15-18 minutes)**

- Friday delivery (customizable)  
- Comprehensive analysis  
- 3-5 bills in depth  
- Congressional Record quotes  
- Multiple perspectives  
- Format: Thoughtful, NPR-style

### 8.2 Daily Brief Script Template

```javascript
const DAILY_BRIEF_TEMPLATE = {
  opening: {
    duration: 20, // seconds
    elements: [
      { type: 'music', asset: 'daily_theme', duration: 3, fade: 'under' },
      { speaker: 'HOST_1', text: 'Good morning, this is your Civic Pulse daily brief for [Date]. I\'m Sarah.' },
      { speaker: 'HOST_2', text: 'And I\'m James. Here\'s what\'s happening in Washington that affects you.' },
      { type: 'music', asset: 'daily_theme', duration: 2, fade: 'out' }
    ]
  },
  
  urgent_item: {
    duration: 90, // seconds
    elements: [
      { speaker: 'HOST_1', text: 'First, urgent news: [Bill/Vote happening today]' },
      { speaker: 'HOST_2', text: '[Quick explanation - 30 seconds]' },
      { speaker: 'HOST_1', text: '[Local impact - 20 seconds]' },
      { speaker: 'HOST_2', text: '[What you can do - 20 seconds]' }
    ]
  },
  
  updates: {
    duration: 180, // seconds
    elements: [
      { speaker: 'HOST_1', text: 'Quick updates on bills you\'re tracking:' },
      // Loop through 2-3 bills with 30-second summaries each
    ]
  },
  
  representative_activity: {
    duration: 60, // seconds
    elements: [
      { speaker: 'HOST_2', text: 'Your representatives this week:' },
      // 20 seconds per representative
    ]
  },
  
  closing: {
    duration: 20, // seconds
    elements: [
      { speaker: 'HOST_1', text: 'That\'s your daily brief. Full details in the app.' },
      { speaker: 'HOST_2', text: 'Stay informed.' },
      { type: 'music', asset: 'daily_theme', duration: 3 }
    ]
  }
};
```

### 8.3 Weekly Deep Dive Script Template

```javascript
const WEEKLY_DEEPDIVE_TEMPLATE = {
  opening: {
    duration: 45,
    elements: [
      { type: 'music', asset: 'weekly_theme', duration: 5, fade: 'under' },
      { speaker: 'HOST_1', text: 'From [Location], this is Civic Pulse. I\'m Sarah.' },
      { speaker: 'HOST_2', text: 'And I\'m James. Today is [Date].' },
      { speaker: 'HOST_1', text: 'Coming up: [Teaser of bills and topics]' },
      { type: 'music', asset: 'weekly_theme', duration: 3, fade: 'out' }
    ]
  },
  
  your_representatives: {
    duration: 300,
    elements: [
      { speaker: 'HOST_1', text: 'Let\'s start with what YOUR elected officials have been up to this week.' },
      // Full representative activity with votes, speeches, bills
    ]
  },
  
  transition_1: {
    duration: 15,
    elements: [
      { type: 'music', asset: 'transition', duration: 3 },
      { speaker: 'HOST_1', text: 'When we come back: [Next topic]' }
    ]
  },
  
  featured_bills: {
    duration: 600, // 10 minutes
    elements: [
      // 3-5 bills with full analysis
      // Congressional Record quotes
      // Multiple perspectives
      // Local impact
    ]
  },
  
  closing: {
    duration: 90,
    elements: [
      { speaker: 'HOST_1', text: 'That\'s your Civic Pulse for this week.' },
      { speaker: 'HOST_2', text: 'All the details, transcripts, and contact tools are in the app.' },
      { speaker: 'HOST_1', text: 'I\'m Sarah.' },
      { speaker: 'HOST_2', text: 'And I\'m James. Stay informed, stay engaged.' },
      { type: 'music', asset: 'weekly_theme', duration: 8 }
    ]
  }
};
```

### 8.4 Podcast Generation Pipeline

```ts
// lib/podcast/generator.ts

import { ClaudeAnalyzer } from '@/lib/ai/claude';
import { VoiceGenerator } from '@/lib/ai/voice';
import { storage } from '@/lib/raindrop/smart-buckets';
import { db } from '@/lib/raindrop/smart-sql';

export async function generatePodcast(
  userId: string,
  type: 'daily' | 'weekly'
): Promise<string> {
  
  const startTime = Date.now();
  
  // 1. Gather data (5-10 seconds)
  const userData = await db.users.findUnique({ where: { id: userId } });
  const representatives = await getRepresentatives(userData.zipCode);
  const bills = await getFeaturedBills(userData, type);
  const crSpeeches = await getCongressionalRecordSpeeches(bills);
  
  // 2. Generate script with Claude (10-15 seconds)
  const claude = new ClaudeAnalyzer();
  const script = await claude.generateScript({
    type,
    user: userData,
    representatives,
    bills,
    crSpeeches,
    targetDuration: type === 'daily' ? 360 : 960, // seconds
  });
  
  // 3. Generate audio with ElevenLabs (20-30 seconds)
  const voice = new VoiceGenerator();
  const audioSegments = await Promise.all(
    script.segments.map(segment => 
      voice.generateSpeech(segment.text, segment.speaker)
    )
  );
  
  // 4. Mix audio (5-10 seconds) - on Vultr compute
  const finalAudio = await mixAudioOnVultr({
    segments: audioSegments,
    music: await loadMusicAssets(type),
    type,
  });
  
  // 5. Upload to SmartBuckets with Vultr CDN (3-5 seconds)
  const audioUrl = await storage.upload({
    key: `podcasts/${userId}/${Date.now()}.mp3`,
    file: finalAudio,
    metadata: {
      userId,
      type,
      duration: calculateDuration(finalAudio),
    },
    options: {
      cdn: true, // Distribute via Vultr CDN
      optimize: true,
    },
  });
  
  // 6. Save episode to database
  const episode = await db.podcastEpisodes.create({
    data: {
      userId,
      episodeType: type,
      title: script.title,
      description: script.description,
      episodeDate: new Date(),
      duration: calculateDuration(finalAudio),
      audioUrl: audioUrl.cdnUrl,
      audioBucketKey: audioUrl.key,
      featuredBills: bills.map(b => b.id),
      featuredRepresentatives: representatives.map(r => r.id),
      scriptJson: script,
      generationStatus: 'completed',
      generationDuration: Math.floor((Date.now() - startTime) / 1000),
    },
  });
  
  return episode.id;
}

// Heavy audio processing on Vultr
async function mixAudioOnVultr(options: MixOptions) {
  // Call Vultr compute instance for heavy processing
  const response = await fetch(`${process.env.VULTR_COMPUTE_URL}/audio/mix`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VULTR_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      segments: options.segments,
      music: options.music,
      type: options.type,
    }),
  });
  
  return response.blob();
}
```

### 8.5 Podcast Scheduling

```ts
// app/api/cron/generate-podcasts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/raindrop/smart-sql';
import { generatePodcast } from '@/lib/podcast/generator';

// Vercel Cron Job - runs every hour
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0 = Sunday, 5 = Friday
  
  // Daily podcasts - generate based on user's preferred time
  const dailyUsers = await db.users.findMany({
    where: {
      podcastFrequency: { in: ['daily', 'both'] },
      subscriptionTier: 'premium', // Only premium gets daily
      dailyTime: {
        gte: `${currentHour}:00:00`,
        lt: `${currentHour + 1}:00:00`,
      },
    },
  });
  
  for (const user of dailyUsers) {
    // Check if already generated today
    const existingEpisode = await db.podcastEpisodes.findFirst({
      where: {
        userId: user.id,
        episodeType: 'daily',
        episodeDate: new Date().toISOString().split('T')[0],
      },
    });
    
    if (!existingEpisode) {
      await generatePodcast(user.id, 'daily');
    }
  }
  
  // Weekly podcasts - Friday at user's preferred time
  if (currentDay === 5) { // Friday
    const weeklyUsers = await db.users.findMany({
      where: {
        podcastFrequency: { in: ['weekly', 'both'] },
        deliveryDay: 'friday',
      },
    });
    
    for (const user of weeklyUsers) {
      const existingEpisode = await db.podcastEpisodes.findFirst({
        where: {
          userId: user.id,
          episodeType: 'weekly',
          episodeDate: { gte: getStartOfWeek() },
        },
      });
      
      if (!existingEpisode) {
        await generatePodcast(user.id, 'weekly');
      }
    }
  }
  
  return NextResponse.json({ success: true });
}
```

---

## 9\. PAYMENT & MONETIZATION {#9.-payment-&-monetization}

### 9.1 Freemium Model

**Free Tier:**

- 1 weekly podcast (generated on Fridays)  
- Dashboard access  
- Basic bill tracking (up to 5 bills)  
- 3 representative profiles

**Premium Tier ($9.99/month):**

- ✅ Daily brief (every morning)  
- ✅ Weekly deep dive  
- ✅ Unlimited bill tracking  
- ✅ Priority podcast generation  
- ✅ Advanced analytics  
- ✅ Export transcripts  
- ✅ Ad-free experience  
- ✅ Early access to new features

### 9.2 Stripe Integration (shadcn/ui)

```ts
// app/pricing/page.tsx

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"

export default function PricingPage() {
  return (
    <div className="container py-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Start free, upgrade anytime
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Tier */}
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Perfect for getting started</CardDescription>
            <div className="text-3xl font-bold mt-4">
              $0<span className="text-base font-normal text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureItem>1 weekly podcast</FeatureItem>
            <FeatureItem>Dashboard access</FeatureItem>
            <FeatureItem>Track up to 5 bills</FeatureItem>
            <FeatureItem>3 representative profiles</FeatureItem>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">Current Plan</Button>
          </CardFooter>
        </Card>
        
        {/* Premium Tier */}
        <Card className="border-primary shadow-lg">
          <CardHeader>
            <CardTitle>Premium</CardTitle>
            <CardDescription>For engaged citizens</CardDescription>
            <div className="text-3xl font-bold mt-4">
              $9.99<span className="text-base font-normal text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureItem>Daily brief (every morning)</FeatureItem>
            <FeatureItem>Weekly deep dive</FeatureItem>
            <FeatureItem>Unlimited bill tracking</FeatureItem>
            <FeatureItem>Priority generation</FeatureItem>
            <FeatureItem>Advanced analytics</FeatureItem>
            <FeatureItem>Export transcripts</FeatureItem>
            <FeatureItem>Ad-free experience</FeatureItem>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleUpgrade}>
              Upgrade to Premium
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Check className="h-4 w-4 text-primary" />
      <span>{children}</span>
    </div>
  )
}
```

### 9.3 Stripe Webhook Handler

```ts
// app/api/webhooks/stripe/route.ts

import { NextRequest } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { db } from '@/lib/raindrop/smart-sql';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = headers().get('stripe-signature');
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleSubscriptionCreated(session);
      break;
      
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      await handlePaymentSucceeded(invoice);
      break;
      
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await handleSubscriptionCanceled(subscription);
      break;
  }
  
  return Response.json({ received: true });
}

async function handleSubscriptionCreated(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  
  await db.users.update({
    where: { id: userId },
    data: {
      subscriptionTier: 'premium',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  
  // Generate first daily podcast immediately
  await generatePodcast(userId!, 'daily');
}
```

---

## 10\. HACKATHON IMPLEMENTATION TIMELINE {#10.-hackathon-implementation-timeline}

### 10.1 24-Hour Timeline (Revised for Raindrop/Vultr)

**Assumes**: 2-person team, using Claude Code

#### **Hours 0-3: Setup & Infrastructure**

**Tasks:**

- [ ] Create Next.js 16 project with TypeScript  
- [ ] Set up Raindrop account and project  
- [ ] Configure Raindrop SmartSQL database  
- [ ] Set up Raindrop SmartBuckets  
- [ ] Create Vultr account and provision resources  
- [ ] Install shadcn/ui  
- [ ] Get all API keys (Congress.gov, Anthropic, ElevenLabs, Stripe)  
- [ ] Configure environment variables

**Using Claude Code:**

```shell
# Claude Code prompts
"Create a Next.js 16 app with TypeScript, Tailwind, and shadcn/ui"
"Set up Raindrop SmartSQL connection with PostgreSQL schema"
"Configure Vultr object storage for audio files"
```

**Deliverable:** Working dev environment with all services connected

#### **Hours 3-7: Database & API Clients**

**Tasks:**

- [ ] Create database schema in Raindrop SmartSQL  
- [ ] Build Congress.gov API client with SmartInference caching  
- [ ] Implement representative lookup  
- [ ] Implement bill fetching  
- [ ] Test all API connections

**Using Claude Code:**

```shell
"Generate the PostgreSQL schema for civic pulse with all tables"
"Create a Congress API client using Raindrop SmartInference"
"Build a function to fetch and cache representative data"
```

**Deliverable:** Data flows from Congress.gov through Raindrop to frontend

#### **Hours 7-11: Authentication & Onboarding**

**Tasks:**

- [ ] Implement Raindrop Auth  
- [ ] Build onboarding flow (3 steps) with shadcn/ui  
- [ ] Zip code validation and geocoding  
- [ ] Interest selection UI  
- [ ] User profile creation

**Using Claude Code:**

```shell
"Create an onboarding flow with shadcn/ui components"
"Implement user authentication with Raindrop Auth"
"Build a zip code input with validation and geocoding"
```

**Deliverable:** New users can complete onboarding

#### **Hours 11-16: Podcast Generation**

**Tasks:**

- [ ] Implement Claude bill analysis  
- [ ] Build Congressional Record fetcher  
- [ ] Create podcast script generator (daily \+ weekly templates)  
- [ ] Integrate ElevenLabs for voice  
- [ ] Set up audio mixing on Vultr compute  
- [ ] Upload to SmartBuckets with Vultr CDN

**Using Claude Code:**

```shell
"Create a Claude prompt to analyze bills and generate plain English summaries"
"Build an ElevenLabs integration for dual-voice podcast generation"
"Set up audio mixing pipeline that runs on Vultr compute"
"Implement SmartBuckets upload with CDN distribution"
```

**Deliverable:** Can generate both daily and weekly podcasts

#### **Hours 16-20: Dashboard & UI**

**Tasks:**

- [ ] Build dashboard layout with shadcn/ui  
- [ ] Create audio player component  
- [ ] Build representative cards  
- [ ] Build bill cards  
- [ ] Implement routing  
- [ ] Make fully responsive

**Using Claude Code:**

```shell
"Create a dashboard with shadcn/ui using tabs, cards, and badges"
"Build an audio player component with waveform visualization"
"Create responsive bill and representative cards"
```

**Deliverable:** Functional dashboard UI

#### **Hours 20-22: Payments & Premium Features**

**Tasks:**

- [ ] Integrate Stripe checkout  
- [ ] Build pricing page  
- [ ] Implement webhook handler  
- [ ] Add premium feature gates  
- [ ] Test payment flow

**Using Claude Code:**

```shell
"Set up Stripe integration with checkout and webhooks"
"Create a pricing page with free and premium tiers using shadcn/ui"
"Implement subscription checks throughout the app"
```

**Deliverable:** Users can upgrade to premium

#### **Hours 22-24: Polish & Deploy**

**Tasks:**

- [ ] Fix critical bugs  
- [ ] Add loading states everywhere  
- [ ] Error handling  
- [ ] Deploy to Raindrop \+ Vultr  
- [ ] Configure DNS and SSL  
- [ ] Record demo video  
- [ ] Prepare pitch  
- [ ] Test end-to-end flow

**Using Claude Code:**

```shell
"Add loading states and error boundaries to all components"
"Deploy the Next.js app to Raindrop with Vultr integration"
"Generate deployment documentation"
```

**Deliverable:** Production-ready app with demo

### 10.2 Critical Path (Must-Haves)

1. ✅ User onboarding (zip \+ interests)  
2. ✅ Weekly podcast generation (at minimum)  
3. ✅ Audio player  
4. ✅ Dashboard with bills and reps  
5. ✅ Stripe payments (freemium)  
6. ✅ Responsive design  
7. ✅ Deployed on Raindrop \+ Vultr

### 10.3 Nice-to-Haves (If Time)

8. Daily podcast  
9. Congressional Record integration  
10. Committee video section  
11. Detailed bill pages  
12. Advanced analytics

---

## 11\. COMPETITION CATEGORY ALIGNMENT {#11.-competition-category-alignment}

### 11.1 Best Voice Agent

**Why Civic Pulse Wins:**

1. **Sophisticated Dual-Voice System**  
     
   - Two distinct personalities (Sarah & James)  
   - Natural conversational flow  
   - Context-aware prosody  
   - Professional NPR production quality

   

2. **Dual Format Innovation**  
     
   - Daily brief (5-7 min) \- quick & energetic  
   - Weekly deep dive (15-18 min) \- comprehensive & thoughtful  
   - Different pacing and tone for each format

   

3. **ElevenLabs Integration Excellence**  
     
   - High-quality voice synthesis  
   - Consistent character voices  
   - Natural speech patterns  
   - Professional audio mixing

   

4. **Content Authenticity**  
     
   - Uses actual Congressional Record speeches  
   - AI extracts and integrates real quotes  
   - Multiple perspectives from floor debates  
   - Cites sources throughout

   

5. **Personalization at Scale**  
     
   - Every podcast unique to user  
   - Dynamically generated scripts  
   - Adapts to user's location and interests

**Demo Strategy:**

- Play 90-second excerpt from weekly podcast  
- Show daily brief (different tone/pacing)  
- Highlight Congressional Record integration  
- Demonstrate voice quality vs. competitors

### 11.2 Best AI Solution for Public Good

**Why Civic Pulse Wins:**

1. **Addresses Critical Societal Problem**  
     
   - 75% of Americans can't name their rep  
   - Civic engagement crisis  
   - Democracy depends on informed citizens

   

2. **Innovative Use of AI**  
     
   - Claude Sonnet 4 for bill analysis  
   - ElevenLabs for accessible audio  
   - Raindrop SmartInference for optimization  
   - AI-powered personalization

   

3. **Scalability & Impact**  
     
   - Works for all 435 House districts \+ 50 states  
   - No human labor needed to scale  
   - Cost-effective civic education  
   - Can reach millions

   

4. **Non-Partisan & Transparent**  
     
   - Presents multiple perspectives  
   - Uses actual congressional speeches  
   - Cites all sources  
   - Objective analysis

   

5. **Actionable**  
     
   - Contact tools for representatives  
   - Clear calls to action  
   - Tracks user engagement  
   - Measures real-world impact

   

6. **Accessibility**  
     
   - Audio format (visual impairment friendly)  
   - Plain English (literacy inclusive)  
   - Free tier (economic accessibility)  
   - Mobile-friendly

**Demo Strategy:**

- Open with problem statistics  
- Show personalization in action  
- Demonstrate contact tools  
- Present scalability vision  
- Emphasize non-partisan approach

### 11.3 Raindrop Platform Excellence

**Why This Showcases Raindrop:**

1. **SmartSQL Intelligence**  
     
   - AI-optimized queries  
   - Automatic indexing  
   - Intelligent caching  
   - Performance monitoring

   

2. **SmartBuckets Efficiency**  
     
   - Adaptive compression  
   - Automatic CDN distribution  
   - Waveform generation  
   - Metadata extraction

   

3. **SmartMemory Optimization**  
     
   - Context-aware caching  
   - Intelligent invalidation  
   - Cost optimization

   

4. **SmartInference Routing**  
     
   - Multi-model orchestration  
   - Cost optimization  
   - Automatic failover  
   - Usage tracking

**Demo Strategy:**

- Show dashboard loading speed (SmartSQL)  
- Demonstrate audio delivery (SmartBuckets \+ Vultr)  
- Highlight cost tracking (SmartInference)  
- Compare performance with/without Raindrop

---

## 12\. DEPLOYMENT STRATEGY {#12.-deployment-strategy}

### 12.1 Architecture Deployment

```
┌─────────────────────────────────────────────────────────┐
│                 FRONTEND DEPLOYMENT                      │
│           (Raindrop Edge Functions)                      │
│                                                          │
│  • Next.js 16 app (SSR + SSG)                          │
│  • Auto-scaling based on traffic                        │
│  • Global edge network                                  │
│  • 99.99% uptime SLA                                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                 DATABASE LAYER                           │
│           (Raindrop SmartSQL)                            │
│                                                          │
│  • PostgreSQL 15                                        │
│  • Automatic backups                                    │
│  • Point-in-time recovery                               │
│  • Read replicas for scaling                            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              COMPUTE LAYER                               │
│         (Vultr Bare Metal)                               │
│                                                          │
│  • Heavy processing (podcast generation)                │
│  • Audio mixing                                         │
│  • Video processing                                     │
│  • Auto-scaling workers                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              STORAGE & CDN                               │
│    (Raindrop SmartBuckets + Vultr CDN)                  │
│                                                          │
│  • Audio files (MP3)                                    │
│  • Static assets                                        │
│  • Global CDN distribution                              │
│  • Low-latency delivery                                 │
└─────────────────────────────────────────────────────────┘
```

### 12.2 Deployment Checklist

**Pre-Deploy:**

- [ ] All environment variables set  
- [ ] Database migrated  
- [ ] API keys validated  
- [ ] Stripe webhooks configured  
- [ ] DNS records configured  
- [ ] SSL certificates provisioned

**Deploy Steps:**

1. **Database Deployment (Raindrop SmartSQL)**

```shell
# Run migrations
npx raindrop-migrate up

# Verify connection
npx raindrop-db-check
```

2. **Frontend Deployment (Raindrop Edge)**

```shell
# Deploy to Raindrop
git push raindrop main

# Verify deployment
curl https://civicpulse.raindrop.app/health
```

3. **Vultr Setup**

```shell
# Provision compute instance
vultr instance create --plan COMPUTE_HIGH_CPU

# Configure object storage
vultr object-storage create --region us-east

# Set up load balancer
vultr load-balancer create --forwarding-rules http:80:http:3000
```

4. **DNS Configuration**

```shell
# Point domain to Raindrop + Vultr
civicpulse.com → Raindrop Edge
cdn.civicpulse.com → Vultr CDN
api.civicpulse.com → Vultr Load Balancer
```

**Post-Deploy:**

- [ ] Smoke test all features  
- [ ] Generate test podcast  
- [ ] Test payment flow  
- [ ] Verify audio playback  
- [ ] Check mobile responsiveness  
- [ ] Monitor error logs

### 12.3 Monitoring & Alerts

```ts
// lib/monitoring/setup.ts

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

// Custom monitoring
export async function logPodcastGeneration(metrics: {
  userId: string;
  type: 'daily' | 'weekly';
  duration: number;
  cost: number;
  success: boolean;
}) {
  await fetch(`${process.env.RAINDROP_ANALYTICS_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'podcast_generated',
      properties: metrics,
    }),
  });
}
```

### 12.4 Scaling Strategy

**Horizontal Scaling:**

- Raindrop Edge Functions auto-scale based on traffic  
- Vultr compute instances spin up/down based on queue depth  
- Database read replicas for heavy read workloads

**Vertical Scaling:**

- SmartSQL automatically optimizes queries  
- SmartBuckets compresses files efficiently  
- CDN caching reduces origin load

**Cost Optimization:**

- SmartInference routes to cheapest model  
- Audio cached on CDN (reduce regeneration)  
- Smart caching reduces database queries  
- Off-peak processing for non-urgent tasks

---

## 13\. APPENDIX

### 13.1 Environment Variables

```shell
# .env.local

# App Config
NEXT_PUBLIC_APP_URL=https://civicpulse.com
NODE_ENV=production

# Raindrop Platform
RAINDROP_SQL_URL=postgresql://...
RAINDROP_SMART_BUCKETS_KEY=...
RAINDROP_SMART_MEMORY_URL=...
RAINDROP_SMART_INFERENCE_KEY=...
RAINDROP_AUTH_SECRET=...

# Vultr
VULTR_API_KEY=...
VULTR_COMPUTE_URL=https://compute.vultr.civicpulse.com
VULTR_CDN_URL=https://cdn.vultr.civicpulse.com
VULTR_OBJECT_STORAGE_KEY=...
VULTR_OBJECT_STORAGE_SECRET=...

# Congress.gov
CONGRESS_API_KEY=...

# Anthropic (Claude)
ANTHROPIC_API_KEY=...

# ElevenLabs
ELEVENLABS_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PREMIUM_PRICE_ID=...

# Geocoding
GOOGLE_CIVIC_API_KEY=...

# Monitoring
SENTRY_DSN=...

# Cron
CRON_SECRET=...
```

### 13.2 Key Commands

```shell
# Development
npm run dev

# Build
npm run build

# Deploy to Raindrop
git push raindrop main

# Database migrations
npx raindrop-migrate up

# Generate shadcn/ui component
npx shadcn-ui@latest add button

# Test podcast generation
npm run test:podcast

# Monitor logs
npx raindrop logs --tail
```

### 13.3 Resources

**Next.js 16:**

- Docs: [https://nextjs.org/docs](https://nextjs.org/docs)  
- Blog: [https://nextjs.org/blog/next-16](https://nextjs.org/blog/next-16)

**Raindrop Platform:**

- Docs: [https://docs.raindrop.dev](https://docs.raindrop.dev)  
- Dashboard: [https://app.raindrop.dev](https://app.raindrop.dev)

**Vultr:**

- Docs: [https://www.vultr.com/docs/](https://www.vultr.com/docs/)  
- API: [https://www.vultr.com/api/](https://www.vultr.com/api/)

**shadcn/ui:**

- Docs: [https://ui.shadcn.com](https://ui.shadcn.com)  
- Components: [https://ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components)

**Congress.gov API:**

- GitHub: [https://github.com/LibraryOfCongress/api.congress.gov](https://github.com/LibraryOfCongress/api.congress.gov)  
- Sign up: [https://api.congress.gov/sign-up/](https://api.congress.gov/sign-up/)

**Anthropic:**

- Docs: [https://docs.anthropic.com](https://docs.anthropic.com)  
- Console: [https://console.anthropic.com](https://console.anthropic.com)

**ElevenLabs:**

- Docs: [https://elevenlabs.io/docs](https://elevenlabs.io/docs)  
- Voice Library: [https://elevenlabs.io/voice-library](https://elevenlabs.io/voice-library)

**Stripe:**

- Docs: [https://stripe.com/docs](https://stripe.com/docs)  
- Dashboard: [https://dashboard.stripe.com](https://dashboard.stripe.com)

---

## END OF PRD v2.0

**Document Version:** 2.0 (Hackathon Edition)  
**Last Updated:** October 24, 2025  
**Platform:** Raindrop \+ Vultr \+ Next.js 16  
**Competition:** Liquid Metal Hackathon  
**Categories:** Best Voice Agent, Best AI Solution for Public Good  
**Owner:** @TarikMKE

**✅ HACKATHON COMPLIANT** **✅ PRODUCTION READY** **✅ LAUNCH READY**

**Let's build this and win\! 🚀🎙️**  
