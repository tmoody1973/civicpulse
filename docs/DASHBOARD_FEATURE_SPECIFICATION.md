# CivicPulse Dashboard Feature Specification

**Project:** HakiVo - AI-Powered Civic Engagement Platform
**Document Version:** 1.0
**Last Updated:** November 3, 2025
**Author:** Product Strategy Team

---

## Executive Summary

This document defines the comprehensive feature set for the CivicPulse dashboard, a mobile-first Progressive Web App (PWA) designed to make legislative engagement accessible through personalized audio briefs, curated news, and intelligent content filtering. The dashboard serves as the central hub where users consume daily audio briefs, discover relevant legislation, access historical content, and engage with civic information tailored to their interests.

**Strategic Vision:** Transform overwhelming 40-page bills into digestible 5-7 minute audio experiences, delivered daily with the polish of NPR and the personalization of Spotify.

**Key Differentiators:**
- **Audio-first experience** with offline playback capability
- **Dual-format content** (audio digest + detailed written version with links)
- **Curated, focused feeds** (only bills matching user subject areas)
- **News-first brief structure** (context before legislation)
- **Trust through transparency** (source citations, selection methodology)

---

## Persona Profiles

### 1. Engaged Citizen (Primary Persona)

**Profile:**
- **Name:** "Civic Sam"
- **Age:** 28-45
- **Occupation:** Working professional with 30-45 min commute
- **Tech Proficiency:** High (uses podcasts, news apps daily)

**Primary Goals:**
- Stay informed on legislation without reading 40-page bills
- Understand how laws impact their community
- Engage meaningfully with representatives

**Pain Points:**
- No time to read lengthy bills during the day
- Congressional jargon is confusing and intimidating
- News overwhelm - too much noise, not enough signal
- Loses track of important legislation in 24-hour news cycle

**Psychological Profile:**
- **Information Processing:** Auditory learner, multitasks while consuming content
- **Engagement Pattern:** Daily micro-sessions (5-10 min) during commute/exercise
- **Trust Factors:** Transparent sourcing, non-partisan analysis, expert credentials
- **Motivation:** Civic duty, desire to be informed voter, social responsibility

**Key Use Cases:**
1. Morning commute: Listen to daily brief while driving
2. Lunch break: Browse written digest with links for deeper exploration
3. Evening: Download tomorrow's brief for offline playback
4. Weekend: Catch up on weekly deep dive during household chores

**Success Metrics:**
- Listens to 5+ daily briefs per week
- Clicks through to 2-3 articles per week
- Downloads briefs for offline use
- Shares content with friends/family monthly

---

### 2. Journalist (Secondary Persona)

**Profile:**
- **Name:** "Reporter Rachel"
- **Age:** 26-38
- **Occupation:** Political reporter or civic tech writer
- **Tech Proficiency:** Very high (power user, uses multiple research tools)

**Primary Goals:**
- Quickly scan latest legislation for story angles
- Track specific bills across their lifecycle
- Find connections between news events and pending legislation
- Access historical context on similar past legislation

**Pain Points:**
- Congress.gov interface is clunky for rapid research
- Hard to connect breaking news with related pending bills
- No efficient way to track 100+ bills simultaneously
- Missing historical precedents for current legislation

**Psychological Profile:**
- **Information Processing:** Rapid scanner, needs quick access to source material
- **Engagement Pattern:** Frequent check-ins (3-5x daily), deep dives as needed
- **Trust Factors:** Direct links to official sources, clear methodology, data accuracy
- **Motivation:** Break stories, provide context, hold power accountable

**Key Use Cases:**
1. Morning: Scan daily brief for breaking legislative news
2. Mid-day: Search for specific bill to fact-check politician's claim
3. Afternoon: Track bills related to developing news story
4. Evening: Listen to weekly deep dive for historical context on topic

**Success Metrics:**
- Uses bill search feature 3+ times per week
- Accesses source citations in written digests
- References HakiVo in published articles
- Subscribes to email notifications for specific topics

---

### 3. Student (Secondary Persona)

**Profile:**
- **Name:** "Scholar Sarah"
- **Age:** 18-24
- **Occupation:** College student (political science, journalism, law)
- **Tech Proficiency:** High (mobile-native, social media savvy)

**Primary Goals:**
- Learn about legislative process through real examples
- Research for papers and class discussions
- Develop informed political opinions
- Find accessible entry point to civic engagement

**Pain Points:**
- Textbooks feel disconnected from real-world politics
- Congressional websites are dense and hard to navigate
- Hard to find unbiased analysis of current legislation
- Intimidated by complexity of legislative language

**Psychological Profile:**
- **Information Processing:** Visual + auditory learner, appreciates scaffolded learning
- **Engagement Pattern:** Project-based bursts, regular background listening
- **Trust Factors:** Educational credibility, clear explanations, no partisan slant
- **Motivation:** Academic success, career development, social awareness

**Key Use Cases:**
1. Study sessions: Background listening to historical legislation podcasts
2. Research: Search for bills on specific topics for paper citations
3. Class prep: Read written digests before political science discussions
4. Advocacy: Share content to campus political groups

**Success Metrics:**
- Listens to 2+ historical deep dive podcasts per month
- Uses search to find bills for academic research
- Accesses written transcripts for citations
- Downloads briefs for offline study sessions

---

### 4. Teacher (Tertiary Persona)

**Profile:**
- **Name:** "Educator Ed"
- **Age:** 35-55
- **Occupation:** High school civics or history teacher
- **Tech Proficiency:** Medium-high (comfortable with ed tech platforms)

**Primary Goals:**
- Find engaging civics content for classroom
- Connect historical legislation to current events
- Provide students with accessible primary sources
- Inspire civic participation among youth

**Pain Points:**
- Civics curriculum feels dry and disconnected from students' lives
- Hard to find age-appropriate legislative content
- Limited time to curate current events for lessons
- Students disengage with traditional textbook approach

**Psychological Profile:**
- **Information Processing:** Educator mindset, seeks scaffolded explanations
- **Engagement Pattern:** Weekly prep sessions, shares content with classes
- **Trust Factors:** Educational standards alignment, citation requirements, clarity
- **Motivation:** Student engagement, teaching effectiveness, civic education mission

**Key Use Cases:**
1. Sunday evening: Prepare weekly lesson using historical legislation podcasts
2. Class time: Play daily brief as current events discussion starter
3. Assignments: Share written digest links for student reading assignments
4. Professional development: Listen to deep dives to expand teaching knowledge

**Success Metrics:**
- Assigns 1-2 briefs as homework per month
- Uses content in classroom discussions weekly
- Recommends platform to colleagues
- Creates lesson plans around historical podcast series

---

## Core Dashboard Architecture

### Information Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  DASHBOARD (Mobile-First, PWA)                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ FIXED HEADER                                         │  │
│  │ - Logo + Navigation                                  │  │
│  │ - Search icon (quick access to bill search)         │  │
│  │ - Settings (subject area preferences, notifications)│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ HERO: TODAY'S AUDIO BRIEF                            │  │
│  │ - Auto-generated daily (6 AM)                        │  │
│  │ - Play/Download button                               │  │
│  │ - Progress indicator (for partially listened)       │  │
│  │ - Duration + Bills covered count                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ DUAL-FORMAT TABS                                     │  │
│  │ ┌────────────┬────────────┐                          │  │
│  │ │ Listen 🎧  │ Read 📰    │                          │  │
│  │ └────────────┴────────────┘                          │  │
│  │                                                       │  │
│  │ [Listen Tab]                                          │  │
│  │ - Audio player (sticky during playback)              │  │
│  │ - Transcript with timestamps                         │  │
│  │ - Source citations (inline)                          │  │
│  │                                                       │  │
│  │ [Read Tab]                                            │  │
│  │ - News articles (with summaries + links)             │  │
│  │ - Legislation summaries (with source links)          │  │
│  │ - More detailed than audio version                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ RECURRING PODCASTS (Twice Weekly)                    │  │
│  │ ┌──────────────┬──────────────┐                      │  │
│  │ │ Historical   │ Presidential │                      │  │
│  │ │ Deep Dive    │ Legacy       │                      │  │
│  │ └──────────────┴──────────────┘                      │  │
│  │ - Latest episode preview                             │  │
│  │ - Play now or add to queue                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ YOUR CURATED FEED                                    │  │
│  │ - Bills matching subject area preferences            │  │
│  │ - Card format: Title, summary, impact score, status  │  │
│  │ - Tap to expand for full details                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ BROWSABLE NEWS                                       │  │
│  │ - Articles from The Hill RSS feeds                   │  │
│  │ - Grouped by category (Congressional, Policy)        │  │
│  │ - Perplexity-enhanced summaries                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ HISTORY / ARCHIVE                                    │  │
│  │ - Past daily briefs (last 30 days)                   │  │
│  │ - Historical podcast episodes                        │  │
│  │ - Presidential legacy episodes                       │  │
│  │ - Filter by: Date, Type, Topic                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ YOUR REPRESENTATIVES (Persistent Section)            │  │
│  │ - 2 Senators + 1 House Rep                           │  │
│  │ - Contact info (phone, office, social)               │  │
│  │ - Recently sponsored bills                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ FIXED BOTTOM (WHEN AUDIO PLAYING)                    │  │
│  │ - Mini player (pause/play, title, progress)         │  │
│  │ - Tap to expand to full player                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature Specifications

### Feature Category 1: Audio Brief System

#### Feature 1.1: Daily Auto-Generated Audio Brief

**Target Personas:** Engaged Citizen (Primary) / Journalist (Secondary) / Student (Secondary)

**Description:**
An automatically generated 5-7 minute audio brief that synthesizes the day's most important legislative news and bill updates, delivered every morning at 6 AM in the user's timezone. The brief uses ElevenLabs text-to-dialogue with two professional NPR-quality hosts (Sarah + James).

**User Value:**
Users stay informed without reading 40-page bills or sifting through hundreds of articles. The audio format fits seamlessly into morning routines (commute, exercise, breakfast prep).

**Psychological Principles Applied:**
- **Cognitive Ease:** Audio reduces cognitive load compared to reading dense legislative text
- **Habit Formation:** Daily delivery at consistent time builds routine engagement
- **Social Proof:** Two-host dialogue format mimics trusted NPR/podcast format
- **Temporal Framing:** "Today's Brief" creates urgency and relevance

**User Stories:**
- As an engaged citizen, I want to receive a daily audio brief automatically so that I stay informed without actively seeking news
- As a journalist, I want to quickly scan legislative updates in audio format so that I can identify story angles during my commute
- As a student, I want accessible daily summaries so that I can learn about current legislation without reading technical documents

**Acceptance Criteria:**
- [ ] Brief auto-generates daily at 6 AM user timezone
- [ ] Duration: 5-7 minutes
- [ ] Audio quality: 192 kbps MP3, 44.1kHz sampling rate
- [ ] Structure: News first, then legislation (as specified by user)
- [ ] Includes 3-5 bills matching user's subject area preferences
- [ ] Cites sources verbally (e.g., "According to The Hill...")
- [ ] Stored in Vultr Object Storage with CDN delivery
- [ ] Available for offline download (PWA caching)
- [ ] Includes transcript with timestamps
- [ ] Notification sent when new brief available (email + push)

**Technical Notes:**
```typescript
// API Route: /api/briefs/daily/generate
// Scheduled via cron job or Netlify scheduled function

import { generateDailyBrief } from '@/lib/ai/brief-generator';
import { uploadToVultr } from '@/lib/storage/vultr';
import { sendPushNotification } from '@/lib/notifications/push';

interface DailyBriefPayload {
  userId: string;
  subjectAreas: string[]; // From user preferences
  timezone: string;
}

async function generateDailyBriefForUser(payload: DailyBriefPayload) {
  // 1. Fetch relevant news from The Hill (via Perplexity API)
  const newsArticles = await getRelevantNews(payload.subjectAreas);

  // 2. Fetch bills matching subject areas (from Raindrop DB)
  const bills = await getMatchingBills(payload.subjectAreas, { limit: 5 });

  // 3. Generate dialogue script (Claude Sonnet 4)
  const dialogue = await generateBriefScript({
    news: newsArticles,
    bills,
    format: 'daily', // 5-7 min target
  });

  // 4. Generate audio (ElevenLabs text-to-dialogue - single API call)
  const audioBuffer = await generateDialogue(dialogue);

  // 5. Upload to Vultr Object Storage
  const audioUrl = await uploadToVultr(audioBuffer, {
    path: `briefs/daily/${payload.userId}/${Date.now()}.mp3`,
    contentType: 'audio/mpeg',
    cacheControl: 'max-age=31536000', // 1 year (immutable content)
  });

  // 6. Save to database
  await db.briefs.create({
    userId: payload.userId,
    type: 'daily',
    audioUrl,
    transcript: dialogue.map(d => d.text).join('\n'),
    newsArticles: newsArticles.map(a => a.id),
    billsCovered: bills.map(b => b.id),
    duration: audioBuffer.duration,
    generatedAt: new Date(),
  });

  // 7. Send notification
  await sendPushNotification(payload.userId, {
    title: "Your Daily Brief is Ready",
    body: "Today's legislation and news - 5 min listen",
    icon: '/logo-192.png',
    data: { audioUrl, briefId: brief.id },
  });
}
```

**Priority:** Must-have (MVP Core Feature)
**Complexity:** XL (Requires Perplexity integration, ElevenLabs dialogue, scheduling, notifications)
**Dependencies:**
- Perplexity API integration for news summarization
- ElevenLabs text-to-dialogue setup (Sarah + James voices)
- Vultr Object Storage configuration
- Push notification system (Web Push API)
- Cron job / Netlify scheduled functions

**Success Metrics:**
- 70%+ of users listen to daily brief within 24 hours of generation
- Average listen-through rate: 85%+ (users complete the brief)
- 30%+ of users download briefs for offline playback
- Push notification click-through rate: 40%+

---

#### Feature 1.2: On-Demand Brief Generation

**Target Personas:** Engaged Citizen (Primary) / Journalist (Secondary)

**Description:**
Users can manually generate a personalized brief at any time by tapping "Generate Brief Now" button. This accommodates users who miss the daily auto-generation or want an updated brief later in the day as news develops.

**User Value:**
Provides flexibility for users with non-standard schedules or who want the latest updates before an important meeting/event.

**Psychological Principles Applied:**
- **Control:** Users feel empowered to access information on their terms
- **Immediacy:** Satisfies need for up-to-the-minute information
- **Loss Aversion:** Reduces anxiety about missing breaking legislative news

**User Stories:**
- As an engaged citizen, I want to generate a fresh brief before voting so that I have the latest information
- As a journalist, I want an updated brief before an interview so that I can ask informed questions
- As a student, I want to generate a brief on-demand before class discussions so that I'm prepared to participate

**Acceptance Criteria:**
- [ ] "Generate Brief Now" button prominently displayed on dashboard
- [ ] Shows loading state during generation (estimated 30-60 seconds)
- [ ] Same quality/format as auto-generated daily brief
- [ ] Includes timestamp: "Generated at 2:45 PM" for transparency
- [ ] Rate limited: Max 3 on-demand briefs per day per user (to manage API costs)
- [ ] Error handling: If generation fails, show cached previous brief with disclaimer
- [ ] Offline fallback: Button disabled when offline, prompts to download existing briefs

**Technical Notes:**
```typescript
// Component: components/dashboard/brief-generator-card.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Radio, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BriefGeneratorProps {
  userId: string;
  dailyBriefsUsed: number; // Track rate limit
  maxDailyBriefs: number;
}

export function BriefGeneratorCard({ userId, dailyBriefsUsed, maxDailyBriefs }: BriefGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerateBrief = dailyBriefsUsed < maxDailyBriefs;

  const handleGenerateBrief = async () => {
    if (!canGenerateBrief) {
      setError(`You've reached your daily limit of ${maxDailyBriefs} briefs. Try again tomorrow!`);
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/briefs/daily/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, onDemand: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate brief');
      }

      const brief = await response.json();

      // Redirect to brief player or auto-play
      window.location.href = `/briefs/${brief.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="w-5 h-5" />
          Generate Fresh Brief
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Get the latest legislative updates right now. Generation takes 30-60 seconds.
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleGenerateBrief}
          disabled={generating || !canGenerateBrief}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating... (30-60s)
            </>
          ) : (
            <>
              <Radio className="mr-2 h-4 w-4" />
              Generate Brief Now
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          {dailyBriefsUsed} / {maxDailyBriefs} briefs used today
        </p>
      </CardContent>
    </Card>
  );
}
```

**Priority:** Should-have (MVP Enhancement)
**Complexity:** M (Reuses daily generation logic, adds rate limiting)
**Dependencies:** Daily brief generation system, rate limiting middleware

**Success Metrics:**
- 20%+ of active users generate on-demand brief at least once per week
- Average time-to-generation: <60 seconds
- Rate limit hit rate: <5% (indicates appropriate limit setting)

---

#### Feature 1.3: Historical Legislation Deep Dive (Recurring Podcast)

**Target Personas:** Student (Primary) / Teacher (Primary) / Engaged Citizen (Secondary)

**Description:**
A twice-weekly 15-18 minute podcast series exploring the 100 most impactful pieces of legislation from 1940-2000. Each episode provides historical context, sponsor details, impact analysis, and connections to modern legislation. Designed for education and deeper civic understanding.

**User Value:**
Users learn legislative history through engaging storytelling, making civics education accessible and relevant. Students can use as research material; teachers can assign as homework.

**Psychological Principles Applied:**
- **Narrative Transportation:** Storytelling format increases retention and engagement
- **Historical Anchoring:** Connecting past to present creates context for current events
- **Episodic Structure:** Series format encourages return visits and habit formation
- **Expertise Building:** Positions users as knowledgeable civic participants

**User Stories:**
- As a student, I want to learn about historical legislation so that I can understand the evolution of policy areas for my research paper
- As a teacher, I want accessible historical content so that I can make civics lessons engaging for high schoolers
- As an engaged citizen, I want context on landmark legislation so that I can better understand references in current political debates

**Acceptance Criteria:**
- [ ] Published twice weekly (e.g., Monday and Thursday at 6 AM)
- [ ] Duration: 15-18 minutes per episode
- [ ] 100-episode series covering 1940-2000 legislation (runs for 50 weeks)
- [ ] Each episode structure:
  - Introduction (30 sec): What we're covering today
  - Historical context (3-4 min): Political climate, key players
  - Bill analysis (5-6 min): What it did, who sponsored, how it passed
  - Impact assessment (3-4 min): Short-term and long-term effects
  - Modern connections (2-3 min): How it relates to today's legislation
  - Conclusion (30 sec): Key takeaways
- [ ] Source citations (verbal and in transcript)
- [ ] Downloadable for offline listening
- [ ] Grouped in "Historical Deep Dive" section of dashboard
- [ ] Filterable by policy area (e.g., Civil Rights, Healthcare, Economy)

**Technical Notes:**
```typescript
// Database Schema Addition
CREATE TABLE IF NOT EXISTS historical_podcasts (
  id TEXT PRIMARY KEY,
  episode_number INTEGER NOT NULL UNIQUE, // 1-100
  bill_id TEXT, // Link to bills table if bill is in database
  bill_congress INTEGER NOT NULL,
  bill_type TEXT NOT NULL,
  bill_number INTEGER NOT NULL,
  bill_title TEXT NOT NULL,
  era TEXT NOT NULL, // "1940s", "1950s", etc.
  policy_area TEXT NOT NULL, // "Civil Rights", "Healthcare", etc.

  audio_url TEXT NOT NULL,
  transcript TEXT NOT NULL,
  duration INTEGER NOT NULL, // seconds

  // Rich metadata for educational use
  historical_context TEXT, // Markdown format
  sponsor_info TEXT, // JSON: { name, party, state, bio }
  impact_analysis TEXT, // Markdown format
  modern_connections TEXT[], // Array of modern bill IDs

  published_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (bill_id) REFERENCES bills(id)
);

// Index for browsing by era
CREATE INDEX idx_historical_podcasts_era
ON historical_podcasts(era, episode_number);

// Index for policy area filtering
CREATE INDEX idx_historical_podcasts_policy
ON historical_podcasts(policy_area, published_at DESC);
```

```typescript
// Component: components/podcast/historical-series-browser.tsx

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { PlayCircle, Download } from 'lucide-react';

interface HistoricalEpisode {
  id: string;
  episodeNumber: number;
  billTitle: string;
  era: string;
  policyArea: string;
  audioUrl: string;
  duration: number;
  publishedAt: Date;
}

interface HistoricalSeriesBrowserProps {
  episodes: HistoricalEpisode[];
  onPlay: (episode: HistoricalEpisode) => void;
}

export function HistoricalSeriesBrowser({ episodes, onPlay }: HistoricalSeriesBrowserProps) {
  const [filterEra, setFilterEra] = useState<string>('all');
  const [filterPolicy, setFilterPolicy] = useState<string>('all');

  const filteredEpisodes = episodes.filter(ep => {
    const eraMatch = filterEra === 'all' || ep.era === filterEra;
    const policyMatch = filterPolicy === 'all' || ep.policyArea === filterPolicy;
    return eraMatch && policyMatch;
  });

  const eras = [...new Set(episodes.map(e => e.era))];
  const policyAreas = [...new Set(episodes.map(e => e.policyArea))];

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={filterEra} onValueChange={setFilterEra}>
          <option value="all">All Eras</option>
          {eras.map(era => (
            <option key={era} value={era}>{era}</option>
          ))}
        </Select>

        <Select value={filterPolicy} onValueChange={setFilterPolicy}>
          <option value="all">All Topics</option>
          {policyAreas.map(area => (
            <option key={area} value={area}>{area}</option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredEpisodes.map(episode => (
          <Card key={episode.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Episode {episode.episodeNumber}</Badge>
                    <Badge>{episode.era}</Badge>
                  </div>
                  <CardTitle className="text-base">{episode.billTitle}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Badge variant="secondary">{episode.policyArea}</Badge>
                  <span>{Math.round(episode.duration / 60)} min</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => downloadEpisode(episode)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={() => onPlay(episode)}>
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Play
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Priority:** Should-have (MVP Enhancement - launches after MVP stable)
**Complexity:** L (Content creation overhead, requires historical research)
**Dependencies:** Daily brief system stable, content research team/process

**Success Metrics:**
- 30%+ of students listen to at least 3 historical episodes per semester
- 15%+ of teachers assign episodes as classroom material
- Average retention rate (listen-through): 75%+
- Episode downloads: 40%+ of plays result in downloads

---

#### Feature 1.4: Presidential Legislation Legacy (Recurring Podcast)

**Target Personas:** Engaged Citizen (Primary) / Student (Secondary) / Teacher (Secondary)

**Description:**
A twice-weekly 15-18 minute podcast series examining each president's most impactful legislation, from FDR to present. Episodes analyze the legislative agenda, key victories, failures, and lasting policy impacts of each presidential administration.

**User Value:**
Users understand the intersection of executive leadership and legislative outcomes, connecting presidential politics to concrete policy changes.

**Psychological Principles Applied:**
- **Personalization:** Framing legislation through presidential legacies makes history personal
- **Comparative Analysis:** Contrasting administrations helps users develop political frameworks
- **Authority Bias:** Presidential focus leverages existing name recognition and interest
- **Temporal Chunking:** Organizing by presidency creates digestible historical segments

**User Stories:**
- As an engaged citizen, I want to understand presidents' legislative records so that I can evaluate current candidates' promises against historical outcomes
- As a student, I want presidential policy analysis so that I can research executive-legislative relationships for my thesis
- As a teacher, I want accessible presidential content so that I can supplement American history lessons with policy depth

**Acceptance Criteria:**
- [ ] Published twice weekly (different days from Historical Deep Dive)
- [ ] Duration: 15-18 minutes per episode
- [ ] Covers FDR through current president (approximately 14 presidents = 28 episodes minimum, 2 episodes per president)
- [ ] Each episode structure:
  - Introduction (30 sec): President and era overview
  - Legislative agenda (4-5 min): Campaign promises, priorities
  - Key legislation (6-7 min): 3-5 most significant bills, passage stories
  - Controversies/failures (2-3 min): What didn't pass, political obstacles
  - Legacy assessment (2-3 min): Long-term impact, modern relevance
  - Conclusion (30 sec): Takeaways for understanding presidential power
- [ ] Source citations (presidential libraries, Congressional Record, historical archives)
- [ ] Downloadable for offline listening
- [ ] Grouped in "Presidential Legacy" section of dashboard
- [ ] Timeline view showing episode sequence by presidency

**Technical Notes:**
```typescript
// Database Schema Addition
CREATE TABLE IF NOT EXISTS presidential_podcasts (
  id TEXT PRIMARY KEY,
  episode_number INTEGER NOT NULL UNIQUE,
  president_name TEXT NOT NULL,
  presidency_start_year INTEGER NOT NULL,
  presidency_end_year INTEGER NOT NULL,
  party TEXT NOT NULL, // "Democrat", "Republican"

  audio_url TEXT NOT NULL,
  transcript TEXT NOT NULL,
  duration INTEGER NOT NULL, // seconds

  // Rich metadata
  key_legislation TEXT, // JSON array of bill objects
  legislative_wins INTEGER, // Count of major bills passed
  legislative_losses INTEGER, // Count of major bills failed
  historical_context TEXT, // Markdown
  legacy_summary TEXT, // Markdown

  published_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

// Index for chronological browsing
CREATE INDEX idx_presidential_podcasts_chronological
ON presidential_podcasts(presidency_start_year ASC, episode_number ASC);
```

**Priority:** Nice-to-have (Post-MVP)
**Complexity:** L (Requires extensive historical research, content creation)
**Dependencies:** Historical Deep Dive system, content research process

**Success Metrics:**
- 25%+ of users listen to at least one presidential episode per month
- Episode completion rate: 70%+
- Teacher adoption: 10%+ of teachers assign presidential content
- Cross-reference clicks: 30%+ of listeners click through to related legislation

---

### Feature Category 2: Dual-Format Content System

#### Feature 2.1: Audio Digest Player

**Target Personas:** All personas

**Description:**
A polished audio player component that provides a seamless listening experience with controls optimized for the dual-host dialogue format. Includes progress tracking, playback speed control, skip forward/back 15 seconds, and background playback support via Media Session API.

**User Value:**
Users enjoy a professional podcast experience comparable to Spotify or Apple Podcasts, with HakiVo-specific features like source citation jump-to-timestamps.

**Psychological Principles Applied:**
- **Familiarity:** Interface mirrors popular podcast apps, reducing learning curve
- **Control:** Playback speed and skip controls empower users to consume at their pace
- **Completion Triggers:** Progress bar and "Almost done" indicators encourage finishing
- **Ambient Accessibility:** Background playback allows multitasking

**User Stories:**
- As an engaged citizen, I want to listen at 1.5x speed so that I can consume content faster during my short commute
- As a journalist, I want to skip back 15 seconds so that I can re-listen to specific bill details for note-taking
- As a student, I want background playback so that I can listen while using other apps for studying

**Acceptance Criteria:**
- [ ] Playback controls: Play/Pause, Skip ±15sec, Speed (0.75x, 1x, 1.25x, 1.5x, 2x)
- [ ] Progress bar: Draggable, shows current time / total time
- [ ] Visual feedback: Waveform visualization (optional) or animated icons
- [ ] Media Session API integration for lock screen controls (mobile)
- [ ] Remembers playback position (resume from where user left off)
- [ ] Auto-advance to next episode (optional user setting)
- [ ] Downloadable for offline playback (PWA cache)
- [ ] Citation jump-to: Tap transcript citation to jump to audio timestamp
- [ ] Volume control (respects device volume)
- [ ] Accessible via keyboard (spacebar play/pause, arrow keys skip)

**Technical Notes:**
```typescript
// Component: components/podcast/enhanced-audio-player.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select } from '@/components/ui/select';
import { Play, Pause, SkipForward, SkipBack, Volume2, Download } from 'lucide-react';

interface EnhancedAudioPlayerProps {
  audioUrl: string;
  title: string;
  transcript?: TranscriptSegment[];
  onEnded?: () => void;
}

interface TranscriptSegment {
  timestamp: number; // seconds
  speaker: 'sarah' | 'james';
  text: string;
  citation?: {
    source: string;
    url: string;
  };
}

export function EnhancedAudioPlayer({ audioUrl, title, transcript, onEnded }: EnhancedAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);

  // Media Session API for lock screen controls
  useEffect(() => {
    if ('mediaSession' in navigator && audioRef.current) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: 'CivicPulse',
        artwork: [
          { src: '/logo-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play();
        setPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setPlaying(false);
      });

      navigator.mediaSession.setActionHandler('seekbackward', () => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', () => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 15);
        }
      });
    }
  }, [title, duration]);

  // Save/restore playback position
  useEffect(() => {
    const savedPosition = localStorage.getItem(`playback-${audioUrl}`);
    if (savedPosition && audioRef.current) {
      audioRef.current.currentTime = parseFloat(savedPosition);
    }

    return () => {
      if (audioRef.current && currentTime > 0 && currentTime < duration - 5) {
        localStorage.setItem(`playback-${audioUrl}`, currentTime.toString());
      }
    };
  }, [audioUrl, currentTime, duration]);

  const handlePlayPause = () => {
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setPlaying(!playing);
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handlePlaybackRateChange = (rate: string) => {
    const rateValue = parseFloat(rate);
    setPlaybackRate(rateValue);
    if (audioRef.current) {
      audioRef.current.playbackRate = rateValue;
    }
  };

  const jumpToTimestamp = (timestamp: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-background border rounded-lg">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          setPlaying(false);
          localStorage.removeItem(`playback-${audioUrl}`);
          onEnded?.();
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Progress bar */}
      <div className="space-y-1">
        <Slider
          value={[currentTime]}
          max={duration}
          step={1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleSkip(-15)}
          aria-label="Skip back 15 seconds"
        >
          <SkipBack className="h-5 w-5" />
          <span className="text-xs absolute -bottom-1">15</span>
        </Button>

        <Button
          size="lg"
          onClick={handlePlayPause}
          className="w-14 h-14 rounded-full"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleSkip(15)}
          aria-label="Skip forward 15 seconds"
        >
          <SkipForward className="h-5 w-5" />
          <span className="text-xs absolute -bottom-1">15</span>
        </Button>
      </div>

      {/* Additional controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[volume]}
            max={1}
            step={0.1}
            onValueChange={(val) => {
              setVolume(val[0]);
              if (audioRef.current) audioRef.current.volume = val[0];
            }}
            className="w-24"
          />
        </div>

        <Select value={playbackRate.toString()} onValueChange={handlePlaybackRateChange}>
          <option value="0.75">0.75x</option>
          <option value="1">1x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </Select>

        <Button variant="ghost" size="icon" onClick={() => downloadAudio(audioUrl)}>
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Transcript with clickable timestamps */}
      {transcript && (
        <div className="mt-6 space-y-3 max-h-96 overflow-y-auto">
          <h3 className="font-semibold text-sm">Transcript</h3>
          {transcript.map((segment, index) => (
            <div
              key={index}
              className={`p-3 rounded-md cursor-pointer transition-colors ${
                currentTime >= segment.timestamp && currentTime < (transcript[index + 1]?.timestamp || duration)
                  ? 'bg-primary/10 border-l-2 border-primary'
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
              onClick={() => jumpToTimestamp(segment.timestamp)}
            >
              <div className="flex items-start gap-3">
                <span className="text-xs text-muted-foreground font-mono">{formatTime(segment.timestamp)}</span>
                <div className="flex-1">
                  <span className="text-xs font-semibold capitalize">{segment.speaker}</span>
                  <p className="text-sm mt-1">{segment.text}</p>
                  {segment.citation && (
                    <a
                      href={segment.citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Source: {segment.citation.source}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function downloadAudio(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = url.split('/').pop() || 'audio.mp3';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
```

**Priority:** Must-have (MVP Core Feature)
**Complexity:** M (Leverages existing audio libraries, adds custom controls)
**Dependencies:** Audio files in Vultr CDN, transcript data from Claude generation

**Success Metrics:**
- 40%+ of users adjust playback speed (indicates power user engagement)
- 60%+ of users utilize skip forward/back buttons
- Background playback usage: 50%+ of mobile listening sessions
- Transcript click-through: 15%+ of users interact with transcript to jump to timestamps

---

#### Feature 2.2: Written Digest with Enhanced Links

**Target Personas:** Journalist (Primary) / Engaged Citizen (Secondary) / Student (Secondary)

**Description:**
A parallel written version of the audio brief that provides more detail than the audio script, includes hyperlinks to source articles, bill pages, and representative contacts. Organized in scannable sections with expandable details. This is the "deep dive" companion to the audio brief.

**User Value:**
Users who prefer reading or need source citations for research can access richer content with direct links to verify claims and explore topics further.

**Psychological Principles Applied:**
- **Progressive Disclosure:** Summary first, expandable details for those wanting depth
- **Credibility:** Direct links to sources build trust and allow verification
- **Multimodal Learning:** Serves visual learners and those needing written reference
- **Information Scent:** Link previews and context help users decide what to explore

**User Stories:**
- As a journalist, I want clickable source links so that I can verify facts for my article
- As a student, I want detailed written summaries so that I can cite them in my research paper
- As an engaged citizen, I want to read the digest at my desk so that I can follow links to explore topics deeply

**Acceptance Criteria:**
- [ ] Mirrors audio brief content but with 30-40% more detail
- [ ] Structure:
  - Executive summary (2-3 sentences)
  - News section (3-5 articles with summaries + links)
  - Legislation section (3-5 bills with expanded analysis + Congress.gov links)
  - Representative spotlight (optional: highlight key votes or statements)
- [ ] All claims have inline citations linking to sources
- [ ] Expandable sections for full bill text, voting records, etc.
- [ ] Mobile-optimized reading experience (16-18px font, high contrast)
- [ ] Shareable: Generate unique URL for each digest
- [ ] Print-friendly CSS for students who want hardcopy
- [ ] Estimated reading time displayed (e.g., "8 min read")
- [ ] Table of contents for long digests (jump links)

**Technical Notes:**
```typescript
// Component: components/briefs/written-digest.tsx

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronDown, ChevronUp, Printer, Share2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface NewsArticle {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: Date;
}

interface BillSummary {
  billNumber: string;
  title: string;
  summary: string;
  impactAnalysis: string;
  sponsor: {
    name: string;
    party: string;
    state: string;
    bioguideId: string;
  };
  status: string;
  congressUrl: string;
}

interface WrittenDigestProps {
  briefId: string;
  date: Date;
  executiveSummary: string;
  newsArticles: NewsArticle[];
  bills: BillSummary[];
  readingTimeMinutes: number;
}

export function WrittenDigest({
  briefId,
  date,
  executiveSummary,
  newsArticles,
  bills,
  readingTimeMinutes
}: WrittenDigestProps) {
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());

  const toggleBillExpansion = (billNumber: string) => {
    setExpandedBills(prev => {
      const next = new Set(prev);
      if (next.has(billNumber)) {
        next.delete(billNumber);
      } else {
        next.add(billNumber);
      }
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/briefs/${briefId}`;
    if (navigator.share) {
      await navigator.share({
        title: `CivicPulse Brief - ${date.toLocaleDateString()}`,
        text: executiveSummary,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      // Show toast: "Link copied to clipboard"
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">
            Daily Brief
          </h1>
          <p className="text-muted-foreground">
            {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <Badge variant="outline" className="mt-2">
            {readingTimeMinutes} min read
          </Badge>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed">{executiveSummary}</p>
        </CardContent>
      </Card>

      <Separator />

      {/* News Section */}
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4">Today's Legislative News</h2>
        <div className="space-y-4">
          {newsArticles.map((article, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-lg font-semibold flex-1">{article.title}</h3>
                  <Badge variant="secondary">{article.source}</Badge>
                </div>
                <p className="text-muted-foreground mb-3 leading-relaxed">
                  {article.summary}
                </p>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                >
                  Read full article at {article.source}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Legislation Section */}
      <section>
        <h2 className="text-2xl font-serif font-bold mb-4">Legislation Highlights</h2>
        <div className="space-y-4">
          {bills.map((bill) => {
            const isExpanded = expandedBills.has(bill.billNumber);

            return (
              <Card key={bill.billNumber}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{bill.billNumber}</Badge>
                        <Badge variant="outline">{bill.status}</Badge>
                      </div>
                      <h3 className="text-lg font-semibold">{bill.title}</h3>
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-3 leading-relaxed">
                    {bill.summary}
                  </p>

                  {/* Sponsor info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <span>Sponsored by</span>
                    <a
                      href={`/representatives/${bill.sponsor.bioguideId}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {bill.sponsor.name}
                    </a>
                    <Badge variant="outline" className="text-xs">
                      {bill.sponsor.party}-{bill.sponsor.state}
                    </Badge>
                  </div>

                  {/* Expandable impact analysis */}
                  {isExpanded && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-md">
                      <h4 className="font-semibold mb-2">Impact Analysis</h4>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {bill.impactAnalysis}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBillExpansion(bill.billNumber)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Show impact analysis
                        </>
                      )}
                    </Button>

                    <a
                      href={bill.congressUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                    >
                      View on Congress.gov
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <Card className="bg-muted/30 print:hidden">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>About this brief:</strong> Generated using AI analysis of official Congressional data,
            news from The Hill, and legislative tracking. All claims are cited with links to original sources.
            <a href="/methodology" className="text-primary hover:underline ml-1">
              Learn about our methodology
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Priority:** Must-have (MVP Core Feature)
**Complexity:** M (Content formatting, link generation, responsive design)
**Dependencies:** Brief generation system, Perplexity API for enhanced summaries

**Success Metrics:**
- 50%+ of users access written digest at least once per week
- Average time on digest page: 5+ minutes (indicates deep reading)
- Click-through to sources: 30%+ of digest views result in external link clicks
- Share rate: 10%+ of digest views result in shares

---

### Feature Category 3: Curated Bill Feed System

#### Feature 3.1: Subject Area Preference Management

**Target Personas:** All personas

**Description:**
A user-friendly interface for selecting and managing subject area preferences (e.g., Healthcare, Technology, Defense). Users can search existing subject areas from a predefined list, add/remove preferences, and see real-time preview of bills matching their selections.

**User Value:**
Users see only relevant bills on their dashboard, eliminating noise and creating a focused, personalized experience.

**Psychological Principles Applied:**
- **Choice Architecture:** Curated list reduces decision paralysis while allowing personalization
- **Feedback Loops:** Real-time preview shows immediate impact of preference changes
- **Control:** Users feel empowered to shape their information environment
- **Cognitive Closure:** Seeing "X bills match your interests" satisfies need for relevance

**User Stories:**
- As an engaged citizen, I want to select healthcare and environment topics so that I only see bills I care about
- As a journalist, I want to quickly adjust my preferences so that I can track bills relevant to my current story beat
- As a student, I want to select education and technology so that I can research bills for my thesis topic

**Acceptance Criteria:**
- [ ] Accessible from dashboard (gear icon) and user settings page
- [ ] Searchable list of 30-40 predefined subject areas
- [ ] Multi-select interface (checkboxes with search filter)
- [ ] Real-time bill count: "45 bills match your selections"
- [ ] Preview mode: See sample bills before saving preferences
- [ ] Save button: Persists to user profile in Raindrop database
- [ ] Default selections based on onboarding choices
- [ ] Minimum 1 subject area required (prevent empty feed)
- [ ] Maximum 10 subject areas (prevent overwhelming feed)
- [ ] Confirmation dialog when removing subject area with active bill tracking

**Technical Notes:**
```typescript
// Subject area taxonomy (predefined)
export const SUBJECT_AREAS = [
  { id: 'healthcare', label: 'Healthcare', description: 'Medicare, Medicaid, insurance, public health' },
  { id: 'technology', label: 'Technology & Privacy', description: 'Data privacy, cybersecurity, AI regulation' },
  { id: 'defense', label: 'Defense & Military', description: 'Military spending, veterans affairs, national security' },
  { id: 'environment', label: 'Environment & Energy', description: 'Climate change, renewable energy, conservation' },
  { id: 'education', label: 'Education', description: 'K-12, higher education, student loans' },
  { id: 'economy', label: 'Economy & Taxes', description: 'Tax policy, budget, economic development' },
  { id: 'immigration', label: 'Immigration', description: 'Border security, visas, citizenship' },
  { id: 'civil-rights', label: 'Civil Rights', description: 'Voting rights, equality, discrimination' },
  { id: 'criminal-justice', label: 'Criminal Justice', description: 'Law enforcement, sentencing, prison reform' },
  { id: 'housing', label: 'Housing', description: 'Affordable housing, homelessness, real estate' },
  { id: 'transportation', label: 'Transportation', description: 'Infrastructure, public transit, aviation' },
  { id: 'agriculture', label: 'Agriculture', description: 'Farm policy, food safety, rural development' },
  { id: 'labor', label: 'Labor & Employment', description: 'Minimum wage, unions, workplace safety' },
  { id: 'finance', label: 'Finance & Banking', description: 'Financial regulation, consumer protection' },
  { id: 'social-services', label: 'Social Services', description: 'Welfare, food assistance, social security' },
  // ... continue to 30-40 total
];

// Component: components/settings/subject-area-selector.tsx

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Info } from 'lucide-react';

interface SubjectAreaSelectorProps {
  initialSelections: string[];
  onSave: (selections: string[]) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubjectAreaSelector({
  initialSelections,
  onSave,
  open,
  onOpenChange
}: SubjectAreaSelectorProps) {
  const [selections, setSelections] = useState<string[]>(initialSelections);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchingBillCount, setMatchingBillCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch matching bill count when selections change
  useEffect(() => {
    if (selections.length > 0) {
      fetchMatchingBillCount(selections);
    } else {
      setMatchingBillCount(0);
    }
  }, [selections]);

  const fetchMatchingBillCount = async (subjectAreas: string[]) => {
    try {
      const response = await fetch('/api/bills/count?' + new URLSearchParams({
        subjectAreas: subjectAreas.join(',')
      }));
      const data = await response.json();
      setMatchingBillCount(data.count);
    } catch (error) {
      console.error('Failed to fetch bill count:', error);
    }
  };

  const filteredAreas = SUBJECT_AREAS.filter(area =>
    area.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (areaId: string) => {
    setSelections(prev => {
      if (prev.includes(areaId)) {
        // Prevent removing last selection
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter(id => id !== areaId);
      } else {
        // Prevent exceeding max selections
        if (prev.length >= 10) {
          return prev;
        }
        return [...prev, areaId];
      }
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(selections);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Show error toast
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = JSON.stringify(selections.sort()) !== JSON.stringify(initialSelections.sort());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Subject Area Preferences</DialogTitle>
          <DialogDescription>
            Select 1-10 subject areas to customize your bill feed. You'll only see legislation matching your interests.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subject areas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Current selections */}
        <div className="flex flex-wrap gap-2">
          {selections.map(areaId => {
            const area = SUBJECT_AREAS.find(a => a.id === areaId);
            return area ? (
              <Badge key={areaId} variant="default">
                {area.label}
              </Badge>
            ) : null;
          })}
          {selections.length === 0 && (
            <span className="text-sm text-muted-foreground">No areas selected (select at least 1)</span>
          )}
        </div>

        {/* Bill count preview */}
        {matchingBillCount !== null && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{matchingBillCount} bills</strong> match your current selections
            </AlertDescription>
          </Alert>
        )}

        {/* Area list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredAreas.map(area => {
            const isSelected = selections.includes(area.id);
            const isOnlySelection = isSelected && selections.length === 1;
            const isMaxReached = !isSelected && selections.length >= 10;

            return (
              <label
                key={area.id}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                } ${isMaxReached ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => !isMaxReached && !isOnlySelection && toggleSelection(area.id)}
                  disabled={isMaxReached || isOnlySelection}
                />
                <div className="flex-1">
                  <div className="font-medium">{area.label}</div>
                  <div className="text-sm text-muted-foreground">{area.description}</div>
                  {isOnlySelection && (
                    <span className="text-xs text-muted-foreground italic">
                      (At least one area required)
                    </span>
                  )}
                </div>
              </label>
            );
          })}

          {filteredAreas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No subject areas match your search
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {selections.length} / 10 areas selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || loading || selections.length === 0}>
              {loading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Priority:** Must-have (MVP Core Feature)
**Complexity:** M (UI component, database integration, real-time preview)
**Dependencies:** User profile schema with subject_areas field, bill tagging system

**Success Metrics:**
- 90%+ of users customize subject areas within first session
- Average subject areas selected: 4-6 (indicates focused but not overly narrow)
- Preference change frequency: 2-3 times per month (indicates active curation)
- Satisfaction with curated feed: 80%+ (from user surveys)

---

#### Feature 3.2: Separate Bill Search Feature

**Target Personas:** Journalist (Primary) / Student (Secondary) / Engaged Citizen (Tertiary)

**Description:**
A dedicated bill search interface allowing users to find legislation outside their subject area preferences. Supports full-text search, filtering by congress, sponsor, status, and date range. Results show bill cards with save/bookmark option to track bills not in curated feed.

**User Value:**
Users can research specific bills for work/school without polluting their personalized daily feed. Journalists can fact-check politician claims; students can find bills for citations.

**Psychological Principles Applied:**
- **Separation of Concerns:** Keep curated feed clean while allowing exploration
- **Discovery Behavior:** Supports "hunting" mode vs. "gathering" mode of information seeking
- **Professional Tools:** Advanced filters signal credibility to power users
- **Bookmarking Psychology:** Save feature reduces anxiety about losing important finds

**User Stories:**
- As a journalist, I want to search for a specific bill number so that I can verify a politician's quote
- As a student, I want to search bills by sponsor so that I can research my representative's legislative record
- As an engaged citizen, I want to search bills from 2010-2015 on healthcare so that I can understand Affordable Care Act history

**Acceptance Criteria:**
- [ ] Accessible via prominent search icon in dashboard header
- [ ] Full-text search across bill title, summary, and full text (if available)
- [ ] Filters:
  - Congress (119th, 118th, ..., back to 100th)
  - Bill type (HR, S, HJRES, etc.)
  - Status (Introduced, Passed House, Passed Senate, Enacted)
  - Sponsor (dropdown with autocomplete)
  - Date range (introduced date, latest action date)
  - Subject area (to narrow within search results)
- [ ] Results display: Bill cards showing number, title, summary snippet, status, sponsor
- [ ] Pagination or infinite scroll (20 results per page)
- [ ] Bookmark button on each result (saves to "Tracked Bills" list)
- [ ] Sort options: Relevance, Most Recent, Impact Score
- [ ] Search history (last 10 searches saved locally)
- [ ] Mobile-optimized with collapsible filters
- [ ] Empty state with search tips and popular searches

**Technical Notes:**
```typescript
// Component: components/bills/bill-search-dialog.tsx

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Bookmark, BookmarkCheck, X } from 'lucide-react';
import { BillCard } from '@/components/dashboard/bill-card';
import type { Bill } from '@/components/dashboard/bill-card';

interface BillSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchFilters {
  query: string;
  congress?: string;
  billType?: string;
  status?: string;
  sponsorBioguideId?: string;
  dateFrom?: string;
  dateTo?: string;
  subjectArea?: string;
  sortBy: 'relevance' | 'date' | 'impact';
}

export function BillSearchDialog({ open, onOpenChange }: BillSearchDialogProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    sortBy: 'relevance',
  });
  const [results, setResults] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [bookmarkedBills, setBookmarkedBills] = useState<Set<string>>(new Set());
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.query) params.append('q', filters.query);
      if (filters.congress) params.append('congress', filters.congress);
      if (filters.billType) params.append('billType', filters.billType);
      if (filters.status) params.append('status', filters.status);
      if (filters.sponsorBioguideId) params.append('sponsor', filters.sponsorBioguideId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.subjectArea) params.append('subjectArea', filters.subjectArea);
      params.append('sortBy', filters.sortBy);
      params.append('page', page.toString());

      const response = await fetch(`/api/bills/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.data.bills);
        setTotalResults(data.data.total);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (billId: string) => {
    try {
      const isBookmarked = bookmarkedBills.has(billId);

      await fetch('/api/bills/bookmark', {
        method: isBookmarked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId }),
      });

      setBookmarkedBills(prev => {
        const next = new Set(prev);
        if (isBookmarked) {
          next.delete(billId);
        } else {
          next.add(billId);
        }
        return next;
      });
    } catch (error) {
      console.error('Bookmark failed:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Search All Legislation</DialogTitle>
        </DialogHeader>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by bill number, title, or keywords..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              onKeyPress={handleKeyPress}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
        </div>

        {/* Filters (collapsible) */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-md">
            <Select
              value={filters.congress || ''}
              onValueChange={(val) => setFilters({ ...filters, congress: val || undefined })}
            >
              <option value="">All Congresses</option>
              <option value="119">119th (2025-2027)</option>
              <option value="118">118th (2023-2025)</option>
              <option value="117">117th (2021-2023)</option>
              {/* ... continue */}
            </Select>

            <Select
              value={filters.status || ''}
              onValueChange={(val) => setFilters({ ...filters, status: val || undefined })}
            >
              <option value="">All Statuses</option>
              <option value="introduced">Introduced</option>
              <option value="passed_house">Passed House</option>
              <option value="passed_senate">Passed Senate</option>
              <option value="enacted">Enacted</option>
            </Select>

            <Select
              value={filters.sortBy}
              onValueChange={(val: any) => setFilters({ ...filters, sortBy: val })}
            >
              <option value="relevance">Relevance</option>
              <option value="date">Most Recent</option>
              <option value="impact">Impact Score</option>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ query: '', sortBy: 'relevance' })}
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading && (
            <div className="text-center py-12 text-muted-foreground">
              Searching legislation...
            </div>
          )}

          {!loading && results.length === 0 && filters.query && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No bills found matching your search</p>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-2">Search tips:</p>
                <ul className="text-left max-w-md mx-auto space-y-1">
                  <li>• Try broader keywords</li>
                  <li>• Use bill number format: "HR 1" or "S 500"</li>
                  <li>• Remove some filters to expand results</li>
                  <li>• Check spelling of sponsor names</li>
                </ul>
              </div>
            </div>
          )}

          {!loading && !filters.query && results.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">Start by searching for a bill number, topic, or keyword</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setFilters({ ...filters, query: 'healthcare' })}
                >
                  Healthcare
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setFilters({ ...filters, query: 'climate' })}
                >
                  Climate
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setFilters({ ...filters, query: 'immigration' })}
                >
                  Immigration
                </Badge>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{totalResults.toLocaleString()} bills found</span>
                <span>Page {page}</span>
              </div>

              {results.map(bill => (
                <div key={bill.id} className="relative">
                  <BillCard bill={bill} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => toggleBookmark(bill.id)}
                  >
                    {bookmarkedBills.has(bill.id) ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}

              {/* Pagination */}
              {totalResults > 20 && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * 20 >= totalResults}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Priority:** Should-have (MVP Enhancement)
**Complexity:** L (Full-text search implementation, advanced filtering, performance optimization)
**Dependencies:** Bill database with full-text index, bookmark system

**Success Metrics:**
- 40%+ of journalists use search feature weekly
- Average search session: 3-5 queries (indicates iterative refinement)
- Bookmark usage: 20%+ of search results get bookmarked
- Search-to-detail click-through: 60%+ (indicates result relevance)

---

*[Continue with remaining features in next response due to length...]*

Would you like me to continue with the remaining feature categories (News Integration, History/Archive, Mobile/PWA, Trust & Transparency) and the implementation roadmap?
---

### Feature Category 4: News Integration

#### Feature 4.1: Browsable News Section

**Target Personas:** Engaged Citizen (Primary) / Journalist (Primary)

**Description:**
A dedicated section on the dashboard displaying news articles from The Hill RSS feeds, organized by category (Congressional, Policy) and enriched with Perplexity API summaries. Articles are separate from briefs, allowing users to browse news on-demand.

**User Value:**
Users can stay current on political news beyond what's included in daily briefs, with AI-enhanced summaries that save reading time.

**Psychological Principles Applied:**
- **Categorization:** Grouping by type reduces cognitive load and aids scanning
- **Summaries First:** Progressive disclosure (summary → full article) respects user time
- **Credibility Markers:** Publication date, source, author build trust
- **Social Currency:** Share-worthy content users can discuss with others

**User Stories:**
- As an engaged citizen, I want to browse policy news so that I understand the context around legislation
- As a journalist, I want to track congressional news so that I can spot story angles and breaking developments
- As a student, I want to find articles for citations so that I can reference current events in my papers

**Acceptance Criteria:**
- [ ] Organized sections: Congressional Updates, Policy & Issues
- [ ] Each article shows:
  - Headline (clickable to external source)
  - AI-generated summary (2-3 sentences via Perplexity)
  - Source (The Hill category)
  - Publication date
  - Share button
- [ ] Refresh button to fetch latest articles
- [ ] Filter by subject area matching user preferences
- [ ] Infinite scroll or "Load More" for older articles
- [ ] Thumbnail images when available
- [ ] Open external links in new tab
- [ ] Mobile-optimized card layout

**Technical Notes:**
```typescript
// API Route: /api/news/browse

import { getTheHillFeeds } from '@/lib/rss/the-hill-feeds';
import { enhanceArticleSummary } from '@/lib/ai/perplexity';
import { db } from '@/lib/db/raindrop';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category'); // 'congressional' | 'policy'
  const subjectArea = searchParams.get('subjectArea');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    // Fetch from The Hill RSS
    const feeds = category === 'congressional' 
      ? ['senate', 'house', 'administration']
      : getTheHillFeeds(subjectArea ? [subjectArea] : []);

    let articles = await fetchRSSArticles(feeds, { limit: limit + offset });
    articles = articles.slice(offset, offset + limit);

    // Enhance with Perplexity summaries
    const enhancedArticles = await Promise.all(
      articles.map(async (article) => {
        const aiSummary = await enhanceArticleSummary(article.description, article.link);
        return {
          ...article,
          aiSummary,
        };
      })
    );

    // Cache for 30 minutes
    return Response.json({
      success: true,
      data: enhancedArticles,
      metadata: { category, total: articles.length + offset },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=1800',
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

**Priority:** Must-have (MVP Core Feature)
**Complexity:** M (RSS parsing, Perplexity integration, UI layout)
**Dependencies:** The Hill RSS feeds, Perplexity API, caching layer

**Success Metrics:**
- 50%+ of users visit news section at least 2x per week
- Click-through to external articles: 35%+
- Time spent in news section: 3+ minutes per visit
- Share rate: 5%+ of viewed articles get shared

---

#### Feature 4.2: Perplexity-Enhanced Summaries

**Target Personas:** All personas

**Description:**
Integration with Perplexity API to provide enhanced summaries of news articles and bill-related content. Perplexity will both summarize articles for briefs AND find relevant articles for bills mentioned in briefs.

**User Value:**
Users get more comprehensive, contextual summaries that connect news events to pending legislation, revealing the "so what" behind bills.

**Psychological Principles Applied:**
- **Relevance Filtering:** AI identifies most important connections, reducing information overload
- **Contextual Learning:** Linking news to legislation aids comprehension and retention
- **Expertise Proxy:** AI analysis positions platform as knowledgeable guide
- **Actionable Insights:** Clear connections enable informed civic participation

**User Stories:**
- As an engaged citizen, I want to understand why a bill matters so that I can decide if I should contact my representative
- As a journalist, I want to see news coverage of a bill so that I can understand public perception and political context
- As a student, I want connections between bills and current events so that I can understand real-world policy impacts

**Acceptance Criteria:**
- [ ] For each article: Perplexity generates 2-3 sentence summary
- [ ] For each bill in brief: Perplexity finds 3-5 related news articles from past 30 days
- [ ] API rate limiting: Max 100 Perplexity calls per user per day
- [ ] Caching: Cache summaries for 24 hours to reduce API costs
- [ ] Error handling: Graceful fallback to original article description if Perplexity fails
- [ ] Citation preservation: Perplexity summaries include source attribution
- [ ] Quality filter: Reject summaries below confidence threshold

**Technical Notes:**
```typescript
// lib/ai/perplexity.ts

import { env } from '@/lib/raindrop';

interface PerplexityRequest {
  model: 'llama-3.1-sonar-small-128k-online' | 'llama-3.1-sonar-large-128k-online';
  messages: Array<{
    role: 'system' | 'user';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  return_citations?: boolean;
}

export async function enhanceArticleSummary(
  articleText: string,
  articleUrl: string
): Promise<{ summary: string; citations: string[] }> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a concise political news summarizer. Create 2-3 sentence summaries that capture the key legislative or policy point of articles.',
          },
          {
            role: 'user',
            content: `Summarize this article in 2-3 sentences, focusing on legislative implications:\n\n${articleText}\n\nSource: ${articleUrl}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.2,
        return_citations: true,
      } as PerplexityRequest),
    });

    const data = await response.json();

    return {
      summary: data.choices[0].message.content,
      citations: data.citations || [],
    };
  } catch (error) {
    console.error('Perplexity API error:', error);
    return {
      summary: articleText.slice(0, 200) + '...', // Fallback to truncated original
      citations: [],
    };
  }
}

export async function findRelatedNews(
  billTitle: string,
  billNumber: string,
  subjectAreas: string[]
): Promise<Array<{ title: string; url: string; source: string; summary: string }>> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online', // Use larger model for research
        messages: [
          {
            role: 'system',
            content: 'You are a legislative news researcher. Find recent credible news articles about specific bills or related policy topics. Return results as JSON array.',
          },
          {
            role: 'user',
            content: `Find 3-5 recent news articles (from past 30 days) related to ${billNumber}: ${billTitle}. Focus on articles from major political news outlets. Return as JSON array with fields: title, url, source, summary (2 sentences).`,
          },
        ],
        max_tokens: 800,
        temperature: 0.3,
        return_citations: true,
      } as PerplexityRequest),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    console.error('Perplexity news search error:', error);
    return [];
  }
}
```

**Priority:** Should-have (MVP Enhancement)
**Complexity:** M (API integration, caching, error handling)
**Dependencies:** Perplexity API key, rate limiting system

**Success Metrics:**
- 80%+ of summaries rated as accurate by users (from feedback surveys)
- Related news discovery: 30%+ of users click through to Perplexity-found articles
- API cost per user: <$0.10 per month (via caching and rate limiting)

---

### Feature Category 5: History & Archive

#### Feature 5.1: Past Briefs Archive

**Target Personas:** All personas

**Description:**
A browsable archive of past daily briefs, organized chronologically with filters for date range and topic. Users can re-listen to previous briefs or read past transcripts.

**User Value:**
Users can catch up on missed briefs, reference past content for discussions, or share historical briefs when topics resurface.

**Psychological Principles Applied:**
- **Temporal Reference:** Archives satisfy desire to "catch up" and reduce FOMO
- **Personal Library:** Collection builds sense of learning progress over time
- **Search Behavior:** Supports "re-finding" of half-remembered information
- **Social Sharing:** Past content becomes evergreen resource for recommendations

**User Stories:**
- As an engaged citizen, I want to listen to last week's briefs so that I can catch up after vacation
- As a journalist, I want to find a brief from 3 months ago so that I can reference earlier coverage of a developing story
- As a student, I want to browse briefs by topic so that I can find examples for my policy timeline assignment

**Acceptance Criteria:**
- [ ] Accessible from dashboard via "Archive" or "History" tab
- [ ] Default view: Last 30 days of briefs in reverse chronological order
- [ ] Each brief entry shows:
  - Date generated
  - Type (daily/weekly/historical/presidential)
  - Bills covered (summary count + expandable list)
  - Duration
  - Play button
  - Download button (for offline)
  - Transcript link
- [ ] Filters:
  - Date range picker (last 7 days, 30 days, 90 days, custom range)
  - Brief type (daily, weekly, historical, presidential)
  - Subject area (bills covered matching user's interests)
- [ ] Search within archive (keyword search across transcripts)
- [ ] Pagination or infinite scroll (20 briefs per page)
- [ ] "Continue listening" indicator for partially completed briefs
- [ ] Share individual brief via link

**Technical Notes:**
```typescript
// Component: components/archive/briefs-archive.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, Filter, Download, Play, FileText } from 'lucide-react';
import { PodcastPlayer } from '@/components/podcast/player';
import type { PodcastEpisode } from '@/components/podcast/player';

interface ArchivedBrief {
  id: string;
  generatedAt: Date;
  type: 'daily' | 'weekly' | 'historical' | 'presidential';
  audioUrl: string;
  transcript: string;
  duration: number;
  billsCovered: Array<{ id: string; title: string }>;
  listenProgress?: number; // seconds
}

export function BriefsArchive() {
  const [briefs, setBriefs] = useState<ArchivedBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<PodcastEpisode | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'custom'>('30');
  const [briefType, setBriefType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBriefs();
  }, [dateRange, briefType, searchQuery]);

  const fetchBriefs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateRange,
        ...(briefType !== 'all' && { type: briefType }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/briefs/archive?${params}`);
      const data = await response.json();

      if (data.success) {
        setBriefs(data.data.briefs);
      }
    } catch (error) {
      console.error('Failed to fetch archive:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (brief: ArchivedBrief) => {
    setCurrentlyPlaying({
      audioUrl: brief.audioUrl,
      title: `${brief.type === 'daily' ? 'Daily Brief' : brief.type === 'weekly' ? 'Weekly Deep Dive' : brief.type === 'historical' ? 'Historical Deep Dive' : 'Presidential Legacy'} - ${new Date(brief.generatedAt).toLocaleDateString()}`,
      type: brief.type as 'daily' | 'weekly',
      duration: brief.duration,
      billsCovered: brief.billsCovered,
      transcript: brief.transcript,
      generatedAt: brief.generatedAt,
    });
  };

  const handleDownload = async (brief: ArchivedBrief) => {
    // Trigger download via service worker for PWA
    const a = document.createElement('a');
    a.href = brief.audioUrl;
    a.download = `civicpulse-${brief.type}-${new Date(brief.generatedAt).toISOString().split('T')[0]}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Date range */}
        <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="custom">Custom range...</option>
        </Select>

        {/* Brief type */}
        <Select value={briefType} onValueChange={setBriefType}>
          <option value="all">All Types</option>
          <option value="daily">Daily Briefs</option>
          <option value="weekly">Weekly Deep Dives</option>
          <option value="historical">Historical Series</option>
          <option value="presidential">Presidential Legacy</option>
        </Select>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading archive...</div>
      ) : briefs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No briefs found matching your filters
        </div>
      ) : (
        <div className="space-y-3">
          {briefs.map((brief) => {
            const progress = brief.listenProgress ? (brief.listenProgress / brief.duration) * 100 : 0;

            return (
              <Card key={brief.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {new Date(brief.generatedAt).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <Badge variant={
                          brief.type === 'daily' ? 'default' :
                          brief.type === 'weekly' ? 'secondary' :
                          'outline'
                        }>
                          {brief.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(brief.duration / 60)} min
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {brief.billsCovered.length} bills covered
                      </p>

                      {progress > 0 && progress < 100 && (
                        <div className="mb-3">
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">
                            {Math.round(progress)}% complete
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handlePlay(brief)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          {progress > 0 && progress < 100 ? 'Continue' : 'Play'}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(brief)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`/briefs/${brief.id}/transcript`, '_blank')}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Transcript
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Player */}
      {currentlyPlaying && (
        <PodcastPlayer
          episode={currentlyPlaying}
          onClose={() => setCurrentlyPlaying(null)}
        />
      )}
    </div>
  );
}
```

**Priority:** Should-have (MVP Enhancement)
**Complexity:** M (Database queries, filtering logic, UI layout)
**Dependencies:** Brief storage in database, playback position tracking

**Success Metrics:**
- 25%+ of users access archive at least once per month
- "Catch up" behavior: 15%+ listen to briefs >7 days old
- Search usage: 10%+ of archive visits include keyword search
- Download rate: 20%+ of archive plays result in downloads

---

### Feature Category 6: Progressive Web App (PWA) Capabilities

#### Feature 6.1: Offline Playback & Download Management

**Target Personas:** Engaged Citizen (Primary) / Student (Secondary)

**Description:**
Full PWA implementation enabling users to download briefs for offline playback, cache essential UI assets, and sync playback progress when back online. Critical for commuters with spotty connectivity and students who want to study on campus Wi-Fi limits.

**User Value:**
Users never lose access to their daily brief due to poor connectivity. Commuters can download at home for subway/airplane listening.

**Psychological Principles Applied:**
- **Reliability:** Offline access builds trust in platform as dependable tool
- **Control:** Users decide what to download, when to sync
- **Anxiety Reduction:** Removes fear of data overages or lost connectivity
- **Habit Reinforcement:** Consistent access enables routine building

**User Stories:**
- As a commuter, I want to download my daily brief at home so that I can listen on the subway without data
- As a student, I want offline access to historical podcasts so that I can study in library without campus Wi-Fi limits
- As an engaged citizen, I want my playback position saved so that I can switch devices mid-brief

**Acceptance Criteria:**
- [ ] Service worker registered on first visit
- [ ] Offline fallback page with cached briefs list
- [ ] Download button on each brief (stores audio + transcript in IndexedDB)
- [ ] Downloaded briefs section showing:
  - File size
  - Download date
  - Delete button
  - Total storage used / available
- [ ] Auto-download option for daily briefs (user preference)
- [ ] Background sync: Upload playback progress when online
- [ ] Storage management:
  - Max 500MB cached content (configurable)
  - Auto-delete briefs >30 days old if storage >80% full
  - Manual delete all option
- [ ] Offline indicator in UI when disconnected
- [ ] "Add to Home Screen" prompt on 2nd visit (iOS/Android)
- [ ] Push notification permission request (for brief delivery)

**Technical Notes:**
```typescript
// public/sw.js (Service Worker)

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `civicpulse-static-${CACHE_VERSION}`;
const AUDIO_CACHE = `civicpulse-audio-${CACHE_VERSION}`;
const TRANSCRIPT_CACHE = `civicpulse-transcripts-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
  '/logo-192.png',
  '/logo-512.png',
  '/_next/static/css/app.css', // Next.js generated CSS
  '/_next/static/chunks/main.js', // Next.js main bundle
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('civicpulse-') && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Audio files: Cache first, network fallback
  if (url.pathname.endsWith('.mp3')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          return (
            response ||
            fetch(request).then((networkResponse) => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            })
          );
        });
      })
    );
    return;
  }

  // API requests: Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET requests
          if (request.method === 'GET' && response.ok) {
            const cache = caches.open(TRANSCRIPT_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((response) => {
            return response || new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // Static assets: Cache first, network fallback
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});

// Background sync for playback progress
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-playback-progress') {
    event.waitUntil(syncPlaybackProgress());
  }
});

async function syncPlaybackProgress() {
  const db = await openDB('civicpulse-offline', 1);
  const tx = db.transaction('playback-progress', 'readonly');
  const store = tx.objectStore('playback-progress');
  const allProgress = await store.getAll();

  await Promise.all(
    allProgress.map(async (item) => {
      try {
        await fetch('/api/playback/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });

        // Delete synced item
        const deleteTx = db.transaction('playback-progress', 'readwrite');
        const deleteStore = deleteTx.objectStore('playback-progress');
        await deleteStore.delete(item.id);
      } catch (error) {
        console.error('Failed to sync progress:', error);
      }
    })
  );
}

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo-192.png',
      badge: '/badge-72.png',
      data: data.data,
      actions: [
        { action: 'play', title: 'Play Now' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'play') {
    event.waitUntil(
      clients.openWindow(`/briefs/${event.notification.data.briefId}`)
    );
  }
});
```

```typescript
// lib/pwa/download-manager.ts

import { openDB, IDBPDatabase } from 'idb';

interface DownloadedBrief {
  id: string;
  audioUrl: string;
  audioBlob: Blob;
  transcript: string;
  downloadedAt: Date;
  fileSize: number;
}

const DB_NAME = 'civicpulse-offline';
const DB_VERSION = 1;
const STORE_NAME = 'downloaded-briefs';
const MAX_STORAGE_MB = 500;

class DownloadManager {
  private db: IDBPDatabase | null = null;

  async init() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('playback-progress')) {
          db.createObjectStore('playback-progress', { keyPath: 'id' });
        }
      },
    });
  }

  async downloadBrief(briefId: string, audioUrl: string, transcript: string): Promise<void> {
    if (!this.db) await this.init();

    // Check storage quota
    const quota = await this.getStorageQuota();
    if (quota.usedMB > MAX_STORAGE_MB * 0.8) {
      await this.cleanOldDownloads();
    }

    // Fetch audio
    const response = await fetch(audioUrl);
    const audioBlob = await response.blob();

    // Save to IndexedDB
    const tx = this.db!.transaction(STORE_NAME, 'readwrite');
    await tx.store.put({
      id: briefId,
      audioUrl,
      audioBlob,
      transcript,
      downloadedAt: new Date(),
      fileSize: audioBlob.size,
    } as DownloadedBrief);

    // Also cache in service worker
    const cache = await caches.open('civicpulse-audio-v1');
    await cache.put(audioUrl, new Response(audioBlob));
  }

  async deleteBrief(briefId: string): Promise<void> {
    if (!this.db) await this.init();

    const tx = this.db!.transaction(STORE_NAME, 'readwrite');
    const brief = await tx.store.get(briefId);

    if (brief) {
      // Remove from cache
      const cache = await caches.open('civicpulse-audio-v1');
      await cache.delete(brief.audioUrl);

      // Remove from IndexedDB
      await tx.store.delete(briefId);
    }
  }

  async getDownloadedBriefs(): Promise<DownloadedBrief[]> {
    if (!this.db) await this.init();

    const tx = this.db!.transaction(STORE_NAME, 'readonly');
    return await tx.store.getAll();
  }

  async getStorageQuota(): Promise<{ usedMB: number; totalMB: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usedMB: (estimate.usage || 0) / (1024 * 1024),
        totalMB: (estimate.quota || 0) / (1024 * 1024),
      };
    }
    return { usedMB: 0, totalMB: 0 };
  }

  async cleanOldDownloads(): Promise<void> {
    if (!this.db) await this.init();

    const briefs = await this.getDownloadedBriefs();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldBriefs = briefs.filter(
      (b) => new Date(b.downloadedAt) < thirtyDaysAgo
    );

    for (const brief of oldBriefs) {
      await this.deleteBrief(brief.id);
    }
  }

  async savePlaybackProgress(briefId: string, currentTime: number, duration: number): Promise<void> {
    if (!this.db) await this.init();

    const tx = this.db!.transaction('playback-progress', 'readwrite');
    await tx.store.put({
      id: briefId,
      currentTime,
      duration,
      timestamp: Date.now(),
    });

    // Trigger background sync when online
    if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-playback-progress');
    }
  }
}

export const downloadManager = new DownloadManager();
```

**Priority:** Must-have (MVP Core Feature - required for mobile-first experience)
**Complexity:** XL (Service worker, IndexedDB, background sync, push notifications)
**Dependencies:** HTTPS deployment, service worker support in browsers

**Success Metrics:**
- 60%+ of mobile users download at least 1 brief per week
- Offline playback sessions: 30%+ of total playback time
- PWA install rate: 25%+ of users add to home screen after 3+ visits
- Background sync success rate: 95%+ (playback progress synced)

---

#### Feature 6.2: Push Notifications

**Target Personas:** Engaged Citizen (Primary)

**Description:**
Web Push API integration to send notifications when new daily briefs are available, breaking legislative news occurs, or tracked bills have status changes. Users control notification preferences granularly.

**User Value:**
Users never miss important updates and can customize notification frequency to match their engagement level.

**Psychological Principles Applied:**
- **Timely Nudges:** Notifications at optimal times (6:30 AM) increase brief consumption
- **Control Paradox:** More notification options increases perceived control, boosts opt-in rates
- **Variable Rewards:** Occasional "breaking news" notifications create anticipation
- **Completion Triggers:** "You're 5 min from finishing yesterday's brief" encourages habit closure

**User Stories:**
- As an engaged citizen, I want a morning notification when my brief is ready so that I remember to listen during breakfast
- As a journalist, I want breaking news alerts so that I can respond quickly to developing stories
- As a student, I want to disable notifications during finals week so that I can focus on exams

**Acceptance Criteria:**
- [ ] Permission request on 2nd dashboard visit (not first - less intrusive)
- [ ] Notification types:
  - Daily brief ready (6:30 AM user timezone)
  - Breaking legislative news (max 1 per day)
  - Tracked bill status change (user-initiated)
  - Weekly digest reminder (Sunday evening)
- [ ] Notification preferences UI:
  - Enable/disable each type independently
  - Quiet hours (no notifications 10 PM - 7 AM)
  - Do Not Disturb mode (pause all for X days)
- [ ] Notification content:
  - Title: "Your Daily Brief is Ready"
  - Body: "Today's legislation and news - 5 min listen"
  - Actions: "Play Now" / "Dismiss"
  - Badge icon (unread count)
- [ ] Click-through: Opens brief player directly
- [ ] Delivered even when app closed (background service worker)
- [ ] Fallback to email for users who decline push permission

**Technical Notes:**
```typescript
// lib/notifications/push.ts

import { webpush } from 'web-push';

// Configure VAPID keys (generate once, store in env vars)
webpush.setVapidDetails(
  'mailto:support@civicpulse.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(
  userId: string,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
    actions?: Array<{ action: string; title: string }>;
  }
) {
  // Get user's push subscription from database
  const subscription = await db.pushSubscriptions.findByUserId(userId);

  if (!subscription) {
    console.log(`No push subscription for user ${userId}`);
    return;
  }

  try {
    await webpush.sendNotification(
      subscription.endpoint,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/logo-192.png',
        badge: payload.badge || '/badge-72.png',
        data: payload.data,
        actions: payload.actions || [],
      })
    );
  } catch (error) {
    if (error.statusCode === 410) {
      // Subscription expired, delete from database
      await db.pushSubscriptions.delete(subscription.id);
    }
    throw error;
  }
}

// Client-side: Request permission and subscribe
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('Push notifications not supported');
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });

    // Save subscription to database
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

**Priority:** Should-have (MVP Enhancement)
**Complexity:** M (Web Push API, permission flow, preferences UI)
**Dependencies:** Service worker, VAPID keys, HTTPS deployment

**Success Metrics:**
- Permission opt-in rate: 50%+ (with 2nd-visit timing)
- Notification click-through rate: 35%+ (for daily brief notifications)
- Unsubscribe rate: <10% per month (indicates relevant content)
- Email fallback usage: 20%+ of users who decline push use email

---

### Feature Category 7: Trust & Transparency

#### Feature 7.1: Methodology Explainer Page

**Target Personas:** All personas (especially Journalist and Student)

**Description:**
A dedicated page explaining "How We Select Bills" and "How Briefs Are Generated", including AI model details, source criteria, bill selection algorithm, and editorial principles. Builds trust through radical transparency.

**User Value:**
Users understand how content is curated, enabling informed trust decisions. Journalists can cite methodology in articles; students can reference for academic integrity.

**Psychological Principles Applied:**
- **Transparency Trust:** Openly sharing process builds credibility
- **Expertise Signaling:** Technical details position platform as sophisticated
- **Academic Rigor:** Methodology documentation satisfies scholarly standards
- **User Empowerment:** Understanding process enables critical consumption

**User Stories:**
- As a journalist, I want to understand bill selection criteria so that I can assess whether to cite HakiVo in my article
- As a student, I want methodology details so that I can reference this platform ethically in my research
- As an engaged citizen, I want to know if content is biased so that I can trust the information

**Acceptance Criteria:**
- [ ] Accessible from footer link: "Our Methodology"
- [ ] Sections:
  1. **Bill Selection Criteria**
     - Source: Congress.gov official API
     - Selection factors: Sponsorship count, committee movement, media coverage, impact score algorithm
     - Exclusion criteria: Ceremonial bills, renamings, minor amendments
  2. **AI Models Used**
     - Claude Sonnet 4 (bill analysis, script generation)
     - ElevenLabs text-to-dialogue (audio generation with Sarah + James voices)
     - Perplexity API (news summarization, article discovery)
     - Raindrop SmartInference (user preference matching)
  3. **News Sources**
     - The Hill RSS feeds (Congressional, Policy categories)
     - Perplexity-verified article credibility
     - Publication date limits (last 7 days for daily briefs)
  4. **Editorial Principles**
     - Non-partisan presentation (no opinion or endorsement)
     - Source citation requirements (all claims attributed)
     - Accuracy verification process
     - User feedback integration
  5. **Data Privacy**
     - User data collection (location, preferences, listening history)
     - Data usage (personalization only, no third-party sharing)
     - Retention policies (playback data: 90 days)
- [ ] FAQ section addressing common concerns
- [ ] Last updated timestamp
- [ ] Contact form for methodology questions
- [ ] Print-friendly format for academic citations

**Technical Notes:**
```typescript
// app/methodology/page.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Shield, Database, Brain } from 'lucide-react';

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-serif font-bold mb-4">Our Methodology</h1>
        <p className="text-lg text-muted-foreground mb-8">
          How we select bills, generate briefs, and maintain accuracy
        </p>

        <div className="space-y-8">
          {/* Bill Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <CardTitle>Bill Selection Criteria</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h3>Data Source</h3>
              <p>
                All bill data comes directly from <a href="https://www.congress.gov" target="_blank" rel="noopener">Congress.gov</a>, 
                the official website of the U.S. Congress. We sync our database daily via the Congress.gov API.
              </p>

              <h3>Selection Algorithm</h3>
              <p>Bills are scored using a multi-factor algorithm considering:</p>
              <ul>
                <li><strong>Sponsorship Support:</strong> Number and distribution of co-sponsors (bipartisan bills score higher)</li>
                <li><strong>Committee Activity:</strong> Hearings held, markup sessions, votes</li>
                <li><strong>Media Coverage:</strong> Mentions in credible news sources (via Perplexity API)</li>
                <li><strong>Legislative Progress:</strong> Movement beyond introduction (committee passage, floor votes)</li>
                <li><strong>User Interest:</strong> Alignment with your subject area preferences</li>
              </ul>

              <h3>What We Exclude</h3>
              <p>To maintain focus on substantive legislation, we filter out:</p>
              <ul>
                <li>Ceremonial resolutions (commendations, commemorations)</li>
                <li>Post office renamings and similar minor designations</li>
                <li>Bills with no activity beyond introduction for >90 days</li>
                <li>Duplicate bills (same content, different sponsors)</li>
              </ul>

              <h3>Impact Score Calculation</h3>
              <p>
                Each bill receives an Impact Score (0-100) based on:
              </p>
              <ul>
                <li>Estimated budget impact (CBO score when available)</li>
                <li>Population affected (demographic analysis)</li>
                <li>Policy novelty vs. incremental change</li>
                <li>Media attention and expert commentary volume</li>
              </ul>
            </CardContent>
          </Card>

          {/* AI Models */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle>AI Models & Technology</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h3>Bill Analysis & Script Generation</h3>
              <div className="flex items-center gap-2 mb-2">
                <Badge>Claude Sonnet 4</Badge>
                <span className="text-xs text-muted-foreground">by Anthropic</span>
              </div>
              <p>
                We use Claude Sonnet 4 to analyze bill text, identify key provisions, assess potential impacts, 
                and generate conversational dialogue scripts for our hosts. The model is prompted to:
              </p>
              <ul>
                <li>Summarize bills in plain language (8th-grade reading level)</li>
                <li>Identify and explain legislative jargon</li>
                <li>Connect bills to real-world impacts on communities</li>
                <li>Maintain strict non-partisan tone (no opinion or endorsement)</li>
              </ul>

              <h3>Voice Generation</h3>
              <div className="flex items-center gap-2 mb-2">
                <Badge>ElevenLabs Text-to-Dialogue</Badge>
              </div>
              <p>
                Audio briefs are generated using ElevenLabs' text-to-dialogue API with two professional voice actors:
              </p>
              <ul>
                <li><strong>Sarah (Primary Host):</strong> Warm, authoritative, experienced journalist tone</li>
                <li><strong>James (Secondary Host):</strong> Curious, analytical, engaging conversationalist</li>
              </ul>
              <p>
                The text-to-dialogue endpoint generates complete multi-speaker conversations in a single API call, 
                ensuring natural pacing, turn-taking, and emotional inflection.
              </p>

              <h3>News Summarization & Discovery</h3>
              <div className="flex items-center gap-2 mb-2">
                <Badge>Perplexity API</Badge>
              </div>
              <p>
                Perplexity's real-time search API serves two purposes:
              </p>
              <ul>
                <li><strong>Article Summarization:</strong> Condenses news articles into 2-3 sentence summaries while preserving key legislative details</li>
                <li><strong>Related News Discovery:</strong> Finds credible news coverage related to specific bills from the past 30 days</li>
              </ul>

              <h3>Personalization & Matching</h3>
              <div className="flex items-center gap-2 mb-2">
                <Badge>Raindrop SmartInference</Badge>
              </div>
              <p>
                Raindrop's SmartInference engine matches bills to your subject area preferences using:
              </p>
              <ul>
                <li>Semantic similarity between bill content and preference keywords</li>
                <li>Co-occurrence analysis (bills frequently covered together)</li>
                <li>User interaction signals (bills you bookmark, share, or listen fully)</li>
              </ul>
            </CardContent>
          </Card>

          {/* News Sources */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>News Sources & Curation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h3>Primary Source: The Hill</h3>
              <p>
                News articles are sourced from <a href="https://thehill.com" target="_blank" rel="noopener">The Hill</a> RSS feeds, 
                chosen for:
              </p>
              <ul>
                <li>Dedicated Congressional coverage (Senate, House, Administration)</li>
                <li>Policy-specific beats (Healthcare, Defense, Technology, etc.)</li>
                <li>Bipartisan readership among Congressional staffers</li>
                <li>Strong RSS infrastructure for real-time updates</li>
              </ul>

              <h3>Content Freshness</h3>
              <ul>
                <li><strong>Daily Briefs:</strong> Include news from past 24 hours</li>
                <li><strong>Weekly Deep Dives:</strong> Synthesize news from past 7 days</li>
                <li><strong>Breaking News Alerts:</strong> Triggered by major legislative events (floor votes, vetoes, etc.)</li>
              </ul>

              <h3>Editorial Standards</h3>
              <p>All news content undergoes automated filtering:</p>
              <ul>
                <li>Opinion pieces and editorials are excluded from briefs</li>
                <li>Articles must contain at least one Congressional bill reference or legislative action</li>
                <li>Duplicate coverage of same story is deduplicated (most recent kept)</li>
                <li>AI-generated summaries are verified against original article text for accuracy</li>
              </ul>
            </CardContent>
          </Card>

          {/* Editorial Principles */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Editorial Principles & Accuracy</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h3>Non-Partisan Commitment</h3>
              <p>
                CivicPulse maintains strict editorial neutrality:
              </p>
              <ul>
                <li>No opinion or endorsement of any bill, candidate, or party</li>
                <li>Equal treatment of Republican, Democratic, and Independent sponsors</li>
                <li>Impact analysis focuses on policy effects, not political implications</li>
                <li>Host dialogue is informative, never persuasive or judgmental</li>
              </ul>

              <h3>Source Citation Requirements</h3>
              <p>
                Every claim in our briefs is attributed:
              </p>
              <ul>
                <li><strong>Audio Briefs:</strong> Verbal citations ("According to The Hill...", "Congress.gov shows...")</li>
                <li><strong>Written Digests:</strong> Hyperlinked citations to original sources</li>
                <li><strong>Bill Analysis:</strong> Direct links to Congress.gov bill pages, sponsor info, and vote records</li>
              </ul>

              <h3>Accuracy Verification</h3>
              <p>Our quality assurance process:</p>
              <ol>
                <li><strong>Automated Checks:</strong> Bill numbers, sponsor names, vote counts verified against Congress.gov API</li>
                <li><strong>AI Review:</strong> Claude re-reads generated scripts for factual consistency with source documents</li>
                <li><strong>User Feedback:</strong> "Report Inaccuracy" button on all briefs triggers manual review</li>
                <li><strong>Corrections Policy:</strong> Errors corrected within 24 hours, corrections appended to transcript</li>
              </ol>

              <h3>User Feedback Integration</h3>
              <p>
                We continuously improve based on user input:
              </p>
              <ul>
                <li>Thumbs up/down ratings on each brief (anonymous)</li>
                <li>"Too technical / Too simple" feedback adjusts reading level</li>
                <li>Topic requests influence bill selection weighting</li>
                <li>Accuracy reports reviewed by team within 48 hours</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>Data Privacy & User Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h3>What We Collect</h3>
              <ul>
                <li><strong>Location:</strong> ZIP code, state, congressional district (for representative matching)</li>
                <li><strong>Preferences:</strong> Subject area interests, notification settings</li>
                <li><strong>Usage Data:</strong> Briefs listened to, playback progress, bills bookmarked</li>
                <li><strong>Feedback:</strong> Ratings, accuracy reports, feature requests</li>
              </ul>

              <h3>How We Use Your Data</h3>
              <ul>
                <li><strong>Personalization:</strong> Match bills to your interests, recommend relevant content</li>
                <li><strong>Analytics:</strong> Improve brief quality, identify popular topics</li>
                <li><strong>Product Development:</strong> Prioritize features, fix bugs</li>
              </ul>

              <h3>What We Don't Do</h3>
              <ul>
                <li>❌ Sell or share your data with third parties</li>
                <li>❌ Track you across other websites</li>
                <li>❌ Use your data for political advertising or campaigns</li>
                <li>❌ Store credit card information (handled by Stripe)</li>
              </ul>

              <h3>Retention Policy</h3>
              <ul>
                <li><strong>Playback History:</strong> 90 days (for progress tracking and recommendations)</li>
                <li><strong>Account Data:</strong> Until account deletion requested</li>
                <li><strong>Anonymous Analytics:</strong> Aggregated indefinitely for product improvement</li>
              </ul>

              <p>
                For complete details, see our <a href="/privacy">Privacy Policy</a>.
              </p>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h3>Is CivicPulse affiliated with any political party or organization?</h3>
              <p>
                No. CivicPulse is an independent platform with no political affiliations, endorsements, or funding from political organizations.
              </p>

              <h3>How do I know the AI-generated summaries are accurate?</h3>
              <p>
                All summaries are verified against original bill text and news articles. We provide direct links to sources so you can 
                verify claims yourself. If you spot an error, use the "Report Inaccuracy" button for manual review.
              </p>

              <h3>Why do you only cover some bills and not all legislation?</h3>
              <p>
                Congress introduces 10,000+ bills per session, most of which never receive a hearing. We focus on substantive bills with 
                realistic prospects of advancement or significant policy impact. You can still search all bills using our bill search feature.
              </p>

              <h3>Can I request coverage of a specific bill?</h3>
              <p>
                Yes! Use the "Request Bill Coverage" form on any bill page. High-demand bills are prioritized in our selection algorithm.
              </p>

              <h3>How often is bill data updated?</h3>
              <p>
                We sync with Congress.gov API every 4 hours to capture new introductions, committee actions, and floor votes.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Last Updated:</strong> November 3, 2025
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Have questions about our methodology? <a href="mailto:methodology@civicpulse.com" className="text-primary hover:underline">Contact us</a>
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Priority:** Must-have (MVP Core Feature - builds trust essential for adoption)
**Complexity:** S (Static content page, minimal interactivity)
**Dependencies:** None

**Success Metrics:**
- 30%+ of first-time users visit methodology page (indicates concern for credibility)
- Average time on page: 3+ minutes (indicates thorough reading)
- Referral citations: Platform referenced in 10+ news articles or academic papers
- User trust score: 80%+ (from user surveys)

---

## Development Roadmap

### MVP (Phase 1) - Core Features for Launch
**Target: Hackathon submission deadline**
**Duration: 4-6 weeks**

**Must-Have Features:**
1. ✅ Daily Audio Brief Generation (auto-generated at 6 AM)
2. ✅ Dual-Format Content (audio player + written digest)
3. ✅ Subject Area Preference Management
4. ✅ Curated Bill Feed (bills matching user preferences only)
5. ✅ Browsable News Section (The Hill RSS + Perplexity summaries)
6. ✅ PWA Offline Playback (service worker, download briefs)
7. ✅ Methodology Explainer Page
8. ✅ Representative Section (2 senators + 1 house rep with contact info)

**MVP Database Schema Additions:**
```sql
-- User preferences
ALTER TABLE users ADD COLUMN subject_areas TEXT; -- JSON array
ALTER TABLE users ADD COLUMN notification_preferences TEXT; -- JSON object
ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'America/New_York';

-- Brief storage
CREATE TABLE IF NOT EXISTS briefs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('daily', 'weekly')),
  audio_url TEXT NOT NULL,
  transcript TEXT NOT NULL,
  news_articles TEXT, -- JSON array of article objects
  bills_covered TEXT NOT NULL, -- JSON array of bill IDs
  duration INTEGER NOT NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Downloaded briefs (for offline tracking)
CREATE TABLE IF NOT EXISTS downloaded_briefs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  brief_id TEXT NOT NULL,
  downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (brief_id) REFERENCES briefs(id) ON DELETE CASCADE
);

-- Playback progress
CREATE TABLE IF NOT EXISTS playback_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  brief_id TEXT NOT NULL,
  current_time INTEGER NOT NULL, -- seconds
  duration INTEGER NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (brief_id) REFERENCES briefs(id) ON DELETE CASCADE,
  UNIQUE(user_id, brief_id)
);
```

**MVP API Routes:**
- `/api/briefs/daily/generate` (POST) - Generate daily brief
- `/api/briefs/[id]` (GET) - Fetch specific brief
- `/api/news/browse` (GET) - Browse news articles
- `/api/bills/count` (GET) - Get matching bill count for preferences
- `/api/user/preferences` (GET/PUT) - Manage subject areas
- `/api/playback/sync` (POST) - Sync playback progress

**MVP Components (shadcn/ui):**
- `EnhancedAudioPlayer` - Full-featured audio player
- `WrittenDigest` - Formatted written brief
- `SubjectAreaSelector` - Preference management dialog
- `BriefsArchive` - Past briefs browser
- `NewsBrowseSection` - News article grid
- `DownloadManager` - Offline download UI

**Success Criteria for MVP Launch:**
- ✅ User can complete onboarding → dashboard in <3 minutes
- ✅ Daily brief generates successfully in <60 seconds
- ✅ Audio playback works on iOS Safari, Android Chrome (95%+ compatibility)
- ✅ Offline download and playback functional
- ✅ No critical bugs (P0/P1 severity)
- ✅ Lighthouse score: 90+ on mobile
- ✅ Methodology page complete and reviewed by 3rd party for accuracy

---

### Phase 2 Enhancements - Post-Launch Improvements
**Target: 4-8 weeks after MVP launch**
**Duration: 6-8 weeks**

**Should-Have Features:**
1. ✅ On-Demand Brief Generation (user-triggered, rate-limited)
2. ✅ Separate Bill Search Feature (advanced search with filters)
3. ✅ Push Notifications (daily brief alerts, breaking news)
4. ✅ Past Briefs Archive (30-day history with search)
5. ✅ Bookmarking System (save bills outside curated feed)
6. ✅ Email Notifications (for users who decline push)

**Phase 2 Priorities:**
- **User Feedback Integration:** Analyze MVP user behavior, prioritize pain points
- **Performance Optimization:** Reduce brief generation time to <45 seconds
- **Notification Optimization:** A/B test notification timing, content, frequency
- **Search Quality:** Improve bill search relevance using Raindrop SmartSQL FTS5

**New Database Tables:**
```sql
-- Bookmarked bills
CREATE TABLE IF NOT EXISTS bookmarked_bills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  bookmarked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT, -- User notes on bill
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  UNIQUE(user_id, bill_id)
);

-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email notification queue
CREATE TABLE IF NOT EXISTS email_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('daily_brief', 'weekly_digest', 'bill_update')),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  scheduled_for DATETIME NOT NULL,
  sent_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Phase 2 Success Metrics:**
- On-demand brief usage: 20%+ of users generate on-demand at least once per week
- Push notification opt-in: 50%+ of mobile users
- Search usage: 40%+ of users use bill search at least once per month
- Bookmark adoption: 30%+ of users bookmark at least 3 bills

---

### Phase 3 - Advanced Features & Recurring Podcasts
**Target: 3-4 months after MVP launch**
**Duration: 8-12 weeks**

**Nice-to-Have Features:**
1. ✅ Historical Legislation Deep Dive (recurring podcast, 100 episodes)
2. ✅ Presidential Legislation Legacy (recurring podcast, 28+ episodes)
3. ✅ Bill Tracking & Alerts (user-initiated tracking with status change notifications)
4. ✅ Social Sharing (share briefs, bills, articles with custom preview cards)
5. ✅ Advanced Analytics Dashboard (for power users: listening streaks, topics explored)

**Content Production:**
- **Historical Series:** Requires research team or partnership with historians
- **Presidential Series:** Requires presidential library access, archival research
- **Production Schedule:** 2 episodes per week (alternating series)

**New Features:**
```sql
-- Historical podcast episodes
CREATE TABLE IF NOT EXISTS historical_podcasts (
  id TEXT PRIMARY KEY,
  episode_number INTEGER NOT NULL UNIQUE,
  bill_id TEXT,
  era TEXT NOT NULL, -- "1940s", "1950s", etc.
  policy_area TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  transcript TEXT NOT NULL,
  duration INTEGER NOT NULL,
  published_at DATETIME NOT NULL,
  FOREIGN KEY (bill_id) REFERENCES bills(id)
);

-- Presidential podcast episodes
CREATE TABLE IF NOT EXISTS presidential_podcasts (
  id TEXT PRIMARY KEY,
  episode_number INTEGER NOT NULL UNIQUE,
  president_name TEXT NOT NULL,
  presidency_start_year INTEGER NOT NULL,
  party TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  transcript TEXT NOT NULL,
  duration INTEGER NOT NULL,
  published_at DATETIME NOT NULL
);

-- Bill tracking (user-initiated)
CREATE TABLE IF NOT EXISTS tracked_bills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  tracked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_notified_status TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  UNIQUE(user_id, bill_id)
);
```

**Phase 3 Success Metrics:**
- Historical podcast adoption: 30%+ of students listen to at least 3 episodes
- Presidential podcast adoption: 25%+ of users listen to at least 1 episode
- Bill tracking: 20%+ of users track at least 1 bill
- Social sharing: 10%+ of users share at least 1 piece of content

---

## Implementation Priorities & Sequencing Logic

### Priority Matrix (User Impact vs. Development Effort)

```
High Impact, Low Effort (Ship First):
- Daily Brief Generation ⭐⭐⭐⭐⭐
- Subject Area Preferences ⭐⭐⭐⭐⭐
- News Section ⭐⭐⭐⭐
- Methodology Page ⭐⭐⭐⭐

High Impact, High Effort (MVP Core):
- Audio Player with Offline ⭐⭐⭐⭐⭐
- PWA Service Worker ⭐⭐⭐⭐⭐
- Written Digest ⭐⭐⭐⭐

Medium Impact, Low Effort (Phase 2):
- On-Demand Brief ⭐⭐⭐
- Archive Browser ⭐⭐⭐
- Push Notifications ⭐⭐⭐

Medium Impact, High Effort (Phase 2/3):
- Bill Search ⭐⭐⭐
- Bookmarking System ⭐⭐⭐

Low Impact, High Effort (Phase 3+):
- Historical Podcast Series ⭐⭐
- Presidential Podcast Series ⭐⭐
- Advanced Analytics ⭐⭐
```

### Dependencies & Sequencing

**Week 1-2: Foundation**
1. User preferences schema + API
2. Subject area taxonomy definition
3. Raindrop database setup with bills table
4. WorkOS authentication integration

**Week 3-4: Core Audio System**
1. ElevenLabs text-to-dialogue integration
2. Vultr Object Storage + CDN setup
3. Claude script generation pipeline
4. Audio player component (shadcn/ui)

**Week 5-6: PWA & Offline**
1. Service worker implementation
2. IndexedDB download manager
3. Background sync for playback progress
4. Add to home screen prompt

**Week 7-8: Content Generation**
1. Perplexity API for news summaries
2. Daily brief scheduler (Netlify Functions)
3. Written digest formatter
4. Bill selection algorithm

**Week 9-10: Polish & Launch Prep**
1. Methodology page content
2. Mobile UI refinements
3. Performance optimization (Lighthouse 90+)
4. User testing & bug fixes

---

## Success Metrics Dashboard

### User Engagement Metrics

**Daily Active Users (DAU):**
- Target: 60%+ of registered users listen to daily brief within 24 hours
- Measurement: Track `playback_progress` table for briefs generated in last 24h

**Listen-Through Rate:**
- Target: 85%+ of users complete daily brief (listen to 90%+ of duration)
- Measurement: `current_time / duration >= 0.9`

**Weekly Retention:**
- Target: 70%+ of users return within 7 days of signup
- Measurement: User activity in `playback_progress` or page visits within 7-day cohorts

**Offline Usage:**
- Target: 30%+ of mobile listening sessions occur offline
- Measurement: Service worker analytics for cached audio playback

---

### Content Quality Metrics

**Accuracy Rate:**
- Target: <5 reported inaccuracies per 1000 briefs generated
- Measurement: "Report Inaccuracy" submissions / total briefs

**User Satisfaction:**
- Target: 80%+ thumbs up on daily briefs
- Measurement: Positive ratings / total ratings

**Completion Rate:**
- Target: 85%+ of briefs generated successfully without errors
- Measurement: Successful generations / attempted generations

---

### Business Metrics (Post-MVP)

**Conversion Rate (Free → Paid):**
- Target: 5%+ of free users upgrade to premium within 30 days
- Measurement: Stripe subscription creation events

**Churn Rate:**
- Target: <10% monthly churn
- Measurement: Cancelled subscriptions / active subscriptions

**Virality (K-factor):**
- Target: 1.2+ (each user refers 1.2 new users on average)
- Measurement: Referral signups / total users

---

## Appendix: Research & Insights

### User Research Findings (from discovery conversations)

**Key Insight #1: Audio-first is non-negotiable**
- Users explicitly requested audio as primary format
- Mobile-first use case (commute, exercise) demands hands-free consumption
- 40-page bills are prohibitive barriers to civic engagement
- NPR-quality production is table stakes for credibility

**Key Insight #2: News must contextualize legislation**
- Users need to understand "why this bill matters" before diving into details
- News-first brief structure (context → legislation) aligns with mental models
- Perplexity's role: Connect breaking news to pending bills, reveal relevance

**Key Insight #3: Curated beats comprehensive**
- Users overwhelmed by noise, want signal only
- Dashboard should show ONLY bills matching subject areas (not all bills)
- Separate bill search serves power users without polluting curated feed
- Quality over quantity: 5 highly relevant bills > 50 loosely related

**Key Insight #4: Dual-format serves different contexts**
- Audio for passive consumption (commute, chores)
- Written for active research (fact-checking, citations, deep exploration)
- Written version MUST have more detail + links than audio script
- Users want flexibility to choose format based on context

**Key Insight #5: Offline is essential for mobile users**
- Commuters have unreliable connectivity (subway, rural areas)
- Students want to download on campus Wi-Fi for later offline listening
- Download capability increases perceived reliability and trust

**Key Insight #6: Trust requires transparency**
- Methodology page is not optional - it's foundational to credibility
- Users (especially journalists and students) need to verify claims
- Source citations in both audio and written formats build confidence
- Non-partisan commitment must be explicit and provable

---

### Competitive Analysis

**NPR Politics Podcast:**
- Strengths: Professional production, trusted brand, expert hosts
- Weaknesses: Not personalized, no bill-specific focus, delayed coverage
- **Our Differentiation:** Personalized to user interests, daily delivery, bill-centric

**Congress.gov:**
- Strengths: Official source, comprehensive data
- Weaknesses: Dense UI, no audio, overwhelming for casual users
- **Our Differentiation:** Audio-first, plain language, curated selection

**Countable:**
- Strengths: Bill tracking, constituent feedback tools
- Weaknesses: Text-heavy, no audio, advocacy-focused
- **Our Differentiation:** Audio briefs, education over advocacy, dual-format

**Voter Voice / Democracy Works:**
- Strengths: Voter registration, election info
- Weaknesses: Limited legislative content, no daily engagement
- **Our Differentiation:** Continuous civic engagement via daily briefs

---

### Technical Architecture Notes

**Raindrop Platform Usage:**
- **SmartSQL:** All database queries (bills, users, briefs, representatives)
- **SmartMemory:** Cache frequently accessed bills, news articles (30 min TTL)
- **SmartInference:** Personalization (match bills to user preferences)
- **SmartBuckets:** Document storage for bill full text (optional future feature)

**Vultr Object Storage:**
- **Path structure:** `/briefs/{type}/{userId}/{timestamp}.mp3`
- **CDN configuration:** Edge caching with 1-year `max-age` (immutable audio)
- **Backup strategy:** Daily snapshots to separate bucket

**ElevenLabs API:**
- **Endpoint:** `/v1/text-to-dialogue`
- **Voices:** Sarah (ID: `{ELEVENLABS_SARAH_VOICE_ID}`), James (ID: `{ELEVENLABS_JAMES_VOICE_ID}`)
- **Settings:** `stability=0.7`, `similarity_boost=0.8`, `output_format=mp3_44100_192`

**Perplexity API:**
- **Model:** `llama-3.1-sonar-large-128k-online` (for news discovery)
- **Model:** `llama-3.1-sonar-small-128k-online` (for summaries, cost-effective)
- **Rate limit:** 100 requests/hour per user
- **Caching:** 24-hour cache for article summaries

**Netlify Deployment:**
- **Environment variables:** Set via Netlify UI or MCP tool
- **Functions:** Daily brief scheduler runs as Netlify scheduled function
- **Build command:** `npm run build`
- **Publish directory:** `.next`

---

### Next Steps for Implementation

**Immediate Actions:**
1. Set up Raindrop database with MVP schema
2. Configure Vultr Object Storage + CDN
3. Generate VAPID keys for push notifications
4. Create ElevenLabs voices (Sarah + James)
5. Implement user preferences API
6. Build subject area selector component
7. Develop daily brief generation pipeline

**First Feature to Build:**
Subject Area Preference Management → enables all downstream personalization

**Critical Path:**
User Preferences → Bill Selection → Script Generation → Audio Generation → Storage → Delivery

**Risk Mitigation:**
- **ElevenLabs API failure:** Cache previous day's brief as fallback
- **Perplexity rate limit:** Degrade to original article descriptions
- **Congress.gov downtime:** Sync during off-peak hours (2-6 AM ET)

---

**END OF SPECIFICATION**

---

**Document Maintenance:**
This specification should be reviewed and updated after each major release, user research session, and quarterly planning cycle. All feature additions require user story validation and success metric definition before implementation.

**Feedback Loop:**
Product team reviews user metrics weekly, updates roadmap priorities monthly based on engagement data and user feedback.

**Version History:**
- v1.0 (Nov 3, 2025): Initial comprehensive specification
