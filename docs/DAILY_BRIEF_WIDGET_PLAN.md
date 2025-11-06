# Daily Brief Widget - Implementation Plan

**Date:** 2025-11-06
**Status:** Planning
**Priority:** High

---

## 🎯 Overview

Implement a Daily Brief Widget on the dashboard that displays the user's most recent audio briefs with integrated Brave Search personalized news.

### Goals
1. Display up to 5 most recent daily briefs on dashboard
2. Integrate Brave Search API for consistent news across widget and briefs
3. Provide quick access to audio playback with Listen Now button
4. Link to full `/briefs` page for complete brief history
5. Improve brief generation performance (3x faster with Brave vs Perplexity)

---

## 📐 Widget Design

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🎙️ Daily Briefs                            [View All →]   │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ┌──────────────┐                                      │  │
│  │ │              │  Today, Nov 6                         │  │
│  │ │  Featured    │  8:32                                 │  │
│  │ │   Image      │                                       │  │
│  │ │  (16:9)      │  Healthcare • Defense • Technology   │  │
│  │ │              │                                       │  │
│  │ └──────────────┘  [🎵 Listen Now]  [💾] [⬇️]         │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ┌──────────────┐                                      │  │
│  │ │              │  Yesterday, Nov 5                     │  │
│  │ │  Featured    │  7:45                                 │  │
│  │ │   Image      │                                       │  │
│  │ │  (16:9)      │  Education • Climate • Business       │  │
│  │ │              │                                       │  │
│  │ └──────────────┘  [🎵 Listen Now]  [💾] [⬇️]         │  │
│  └───────────────────────────────────────────────────────┘  │
│  ... (up to 5 total briefs)                                 │
│                                                               │
│  [+ Generate Today's Brief] (if none exists)                │
└─────────────────────────────────────────────────────────────┘
```

### Visual Specifications

**Card Layout:**
- Featured image on left (16:9 aspect ratio, 200x113px)
- Content on right with:
  - Date label ("Today", "Yesterday", or formatted date)
  - Duration badge
  - Policy area tags (max 3 visible, "+N more")
  - Action buttons (Listen Now, Save, Download)

**Responsive Behavior:**
- **Desktop (1024px+):** Vertical list, full-width cards
- **Tablet (768px):** Vertical list, slightly smaller cards
- **Mobile (<640px):** Stack image on top, content below

**Color Scheme:**
- Use existing shadcn/ui colors
- Primary color for Listen Now button
- Secondary color for badges
- Muted colors for dates/metadata

---

## 🏗️ Component Structure

### File Organization

```
components/dashboard/
├── daily-brief-widget.tsx          # Main widget component
└── daily-brief-card.tsx            # Individual brief card (compact)

app/
├── briefs/
│   └── page.tsx                    # Full briefs page (new)
└── dashboard/
    └── page.tsx                    # Add widget here

app/api/
└── briefs/
    ├── route.ts                    # GET all briefs
    ├── generate-daily/route.ts     # Update to use Brave Search
    └── [id]/route.ts               # GET single brief
```

### Component Props

#### `DailyBriefWidget`
```typescript
interface DailyBriefWidgetProps {
  limit?: number;              // Default: 5
  showGenerateButton?: boolean; // Default: true
}
```

#### `DailyBriefCard` (Compact version of `BriefCard`)
```typescript
interface DailyBriefCardProps {
  id: string;
  title: string;
  featuredImage: string;
  audioUrl: string;
  duration: number;
  policyAreas: string[];
  generatedAt: Date;
  type: 'daily' | 'weekly';
  compact?: boolean;           // New: compact layout for widget
  onSave?: () => void;
  onDownload?: () => void;
}
```

---

## 🔄 API Integration

### Current Flow (Perplexity)
```
generate-daily/route.ts
  ↓
fetchNewsArticles() → Perplexity API
  ↓
Perplexity sonar-pro model (~3-5s)
  ↓
Return 10 news articles
```

### New Flow (Brave Search)
```
generate-daily/route.ts
  ↓
fetchNewsArticles() → Brave Search API
  ↓
getPersonalizedNewsFast() from cerebras-tavily.ts
  ↓
Brave Search (~500ms)
  ↓
Return 40 articles (5 per topic × 8 topics)
```

### Implementation Changes

**File:** `app/api/briefs/generate-daily/route.ts`

**Changes Required:**
1. Replace `fetchNewsArticles()` function (line 255-278)
2. Import `getPersonalizedNewsFast()` from `@/lib/api/cerebras-tavily`
3. Update news article interface to match Brave results
4. Select top news article as "breaking news"
5. Pass remaining articles to Claude for context

**New `fetchNewsArticles()` function:**
```typescript
async function fetchNewsArticles(policyAreas: string[]): Promise<NewsArticle[]> {
  try {
    // Use the same Brave Search integration as personalized news widget
    const articles = await getPersonalizedNewsFast(
      policyAreas,
      undefined, // state (optional)
      undefined  // district (optional)
    );

    // Convert from PerplexityArticle to NewsArticle format
    return articles.map(article => ({
      title: article.title,
      summary: article.summary,
      policy_area: article.relevantTopics[0] || 'General',
      link: article.url,
      source_url: article.url,
      source: article.source,
      published_date: article.publishedDate,
    }));
  } catch (error) {
    console.error('Error fetching news articles:', error);
    return [];
  }
}
```

---

## 📊 Data Flow

### Fetching Recent Briefs

**API Endpoint:** `GET /api/briefs?limit=5&type=daily`

**Response:**
```json
{
  "success": true,
  "briefs": [
    {
      "id": "brief_user123_1699200000000",
      "user_id": "user123",
      "type": "daily",
      "title": "Daily Brief - November 6, 2025",
      "audio_url": "https://cdn.hakivo.com/...",
      "featured_image_url": "https://images.unsplash.com/...",
      "duration": 512,
      "policy_areas": ["healthcare", "defense", "technology"],
      "news_count": 3,
      "bill_count": 8,
      "generated_at": "2025-11-06T10:00:00Z"
    }
  ],
  "total": 15,
  "has_more": true
}
```

### Database Schema (Existing)

**Table:** `briefs`

```sql
CREATE TABLE briefs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'daily' or 'weekly'
  audio_url TEXT NOT NULL,
  transcript TEXT,
  written_digest TEXT,
  news_articles TEXT,           -- JSON array
  bills_covered TEXT,           -- JSON array of bill IDs
  policy_areas TEXT,            -- JSON array
  duration INTEGER,             -- seconds
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  featured_image_url TEXT       -- NEW: Add this column
);
```

**Migration Needed:**
```sql
ALTER TABLE briefs ADD COLUMN featured_image_url TEXT;
```

---

## 🎨 UI Components

### 1. Daily Brief Widget Component

**File:** `components/dashboard/daily-brief-widget.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DailyBriefCard } from './daily-brief-card';
import Link from 'next/link';

interface Brief {
  id: string;
  title: string;
  audio_url: string;
  featured_image_url: string;
  duration: number;
  policy_areas: string[];
  generated_at: string;
  type: 'daily' | 'weekly';
}

export function DailyBriefWidget({ limit = 5 }: { limit?: number }) {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchBriefs();
  }, []);

  const fetchBriefs = async () => {
    try {
      const response = await fetch(`/api/briefs?limit=${limit}&type=daily`);
      const data = await response.json();

      if (data.success) {
        setBriefs(data.briefs || []);
      }
    } catch (error) {
      console.error('Error fetching briefs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBrief = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/briefs/generate-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_regenerate: false }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh list
        await fetchBriefs();
      }
    } catch (error) {
      console.error('Error generating brief:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasTodayBrief = briefs.length > 0 &&
    new Date(briefs[0].generated_at).toDateString() === new Date().toDateString();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">🎙️ Daily Briefs</h2>
        </div>
        <Link href="/briefs">
          <Button variant="ghost" size="sm" className="gap-1">
            View All
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Generate Button (if no brief today) */}
      {!hasTodayBrief && (
        <Button
          onClick={handleGenerateBrief}
          disabled={generating}
          className="w-full"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Today's Brief...
            </>
          ) : (
            '+ Generate Today\'s Brief'
          )}
        </Button>
      )}

      {/* Brief List */}
      <div className="space-y-3">
        {briefs.map((brief) => (
          <DailyBriefCard
            key={brief.id}
            id={brief.id}
            title={brief.title}
            featuredImage={brief.featured_image_url}
            audioUrl={brief.audio_url}
            duration={brief.duration}
            policyAreas={brief.policy_areas}
            generatedAt={new Date(brief.generated_at)}
            type={brief.type}
            compact={true}
          />
        ))}
      </div>

      {briefs.length === 0 && !generating && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">No briefs generated yet</p>
          <Button onClick={handleGenerateBrief} disabled={generating}>
            Generate Your First Brief
          </Button>
        </div>
      )}
    </div>
  );
}
```

### 2. Compact Daily Brief Card

**File:** `components/dashboard/daily-brief-card.tsx`

```typescript
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Download } from 'lucide-react';
import { ListenNowButton } from '@/components/audio/listen-now-button';
import type { Brief } from '@/contexts/audio-player-context';

interface DailyBriefCardProps {
  id: string;
  title: string;
  featuredImage: string;
  audioUrl: string;
  duration: number;
  policyAreas: string[];
  generatedAt: Date;
  type: 'daily' | 'weekly';
  compact?: boolean;
  onSave?: () => void;
  onDownload?: () => void;
}

export function DailyBriefCard({
  id,
  title,
  featuredImage,
  audioUrl,
  duration,
  policyAreas,
  generatedAt,
  type,
  compact = false,
  onSave,
  onDownload,
}: DailyBriefCardProps) {
  const brief: Brief = {
    id,
    title,
    audio_url: audioUrl,
    featured_image_url: featuredImage,
    duration,
    type,
    generated_at: generatedAt.toISOString(),
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateStr = date.toDateString();
    if (dateStr === today.toDateString()) return 'Today';
    if (dateStr === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isValidImageUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http') && !url.includes('[object');
    } catch {
      return false;
    }
  };

  const hasValidImage = isValidImageUrl(featuredImage);

  if (compact) {
    // Compact layout for dashboard widget
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <Link href={`/briefs/${id}`}>
          <div className="flex gap-4 p-4">
            {/* Featured Image */}
            <div className="relative w-48 aspect-video bg-muted flex-shrink-0 rounded-md overflow-hidden">
              {hasValidImage ? (
                <Image
                  src={featuredImage}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="200px"
                  unoptimized
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/10 to-primary/5">
                  <span className="text-primary/40 text-xs">No Image</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Date & Duration */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">{formatDate(generatedAt)}</span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{formatDuration(duration)}</span>
              </div>

              {/* Policy Areas */}
              <div className="flex flex-wrap gap-1 mb-3">
                {policyAreas.slice(0, 3).map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
                {policyAreas.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{policyAreas.length - 3}
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <ListenNowButton
                  brief={brief}
                  variant="default"
                  size="sm"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    onSave?.();
                  }}
                >
                  <Bookmark className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    onDownload?.();
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Link>
      </Card>
    );
  }

  // Full card layout (reuse existing BriefCard component)
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* ... existing full card implementation ... */}
    </Card>
  );
}
```

---

## 🔧 API Routes

### Update `GET /api/briefs`

**File:** `app/api/briefs/route.ts`

Add query parameters:
- `limit`: Number of briefs (default: 20)
- `offset`: Pagination offset (default: 0)
- `type`: Filter by 'daily' or 'weekly'
- `user_id`: Automatic from session

**Response format:**
```json
{
  "success": true,
  "briefs": [...],
  "total": 15,
  "has_more": true
}
```

### Update `POST /api/briefs/generate-daily`

**Changes:**
1. Replace Perplexity with Brave Search
2. Add `featured_image_url` to database insert
3. Extract feature image from top news article

---

## 📄 Full Briefs Page

### Page Structure

**File:** `app/briefs/page.tsx`

```typescript
import { Suspense } from 'react';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { BriefsGrid } from '@/components/briefs/briefs-grid';
import { BriefFilters } from '@/components/briefs/brief-filters';

export default async function BriefsPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Your Briefs</h1>
        <p className="text-muted-foreground">
          Access your personalized audio and written briefs
        </p>
      </div>

      <BriefFilters />

      <Suspense fallback={<BriefsGridSkeleton />}>
        <BriefsGrid />
      </Suspense>
    </div>
  );
}
```

**Layout:**
- 1 column on mobile (<640px)
- 2 columns on tablet (768px)
- 3 columns on desktop (1024px+)
- Infinite scroll or pagination

---

## ✅ Implementation Checklist

### Phase 1: Foundation
- [ ] Add `featured_image_url` column to briefs table
- [ ] Update `generate-daily` API to use Brave Search
- [ ] Extract featured image from top news article
- [ ] Test brief generation with new integration

### Phase 2: Widget Components
- [ ] Create `DailyBriefCard` component (compact variant)
- [ ] Create `DailyBriefWidget` component
- [ ] Add widget to dashboard page
- [ ] Test audio playback with AudioPlayerContext

### Phase 3: Full Page
- [ ] Create `/briefs` page
- [ ] Create `BriefsGrid` component
- [ ] Create `BriefFilters` component
- [ ] Implement pagination or infinite scroll

### Phase 4: Polish
- [ ] Add loading states and skeletons
- [ ] Add empty states
- [ ] Add error handling
- [ ] Test responsive design
- [ ] Add animations/transitions

---

## 🧪 Testing Plan

### Manual Testing
1. **Brief Generation**
   - Generate brief with Brave Search news
   - Verify audio generation works
   - Check featured image extraction
   - Verify database storage

2. **Dashboard Widget**
   - Display 5 recent briefs
   - Test Listen Now button
   - Test Save/Download actions
   - Verify "View All" link

3. **Full Briefs Page**
   - Display grid of all briefs
   - Test filtering by type
   - Test pagination
   - Test responsive layout

### Automated Testing
```typescript
// __tests__/components/daily-brief-widget.test.tsx
describe('DailyBriefWidget', () => {
  it('displays recent briefs', async () => {
    // Mock API response
    // Render widget
    // Assert briefs are displayed
  });

  it('shows generate button when no brief today', () => {
    // Test logic
  });
});
```

---

## 📊 Performance Targets

- **Brief Generation:** <60s (down from ~90s with Perplexity)
- **News Fetching:** <1s (Brave Search)
- **Widget Load Time:** <500ms
- **Page Load (briefs):** <2s
- **Audio Player Start:** <1s

---

## 🔮 Future Enhancements

1. **Smart Scheduling**
   - Auto-generate brief at 6am user local time
   - Email notification when ready

2. **Brief Customization**
   - Toggle news vs bills focus
   - Adjust duration (5min, 10min, 15min)
   - Select specific policy areas per brief

3. **Sharing**
   - Share brief via link
   - Embed player on external sites
   - RSS feed for podcast apps

4. **Analytics**
   - Track listening completion rate
   - Most engaged policy areas
   - Optimal brief length

---

## 📚 References

- [Existing BriefCard component](../components/briefs/brief-card.tsx)
- [generate-daily API route](../app/api/briefs/generate-daily/route.ts)
- [Brave Search integration](../lib/api/cerebras-tavily.ts)
- [AudioPlayerContext](../contexts/audio-player-context.tsx)
- [shadcn/ui Card](https://ui.shadcn.com/docs/components/card)
- [shadcn/ui Badge](https://ui.shadcn.com/docs/components/badge)

---

**Next Steps:** Begin Phase 1 implementation → Database migration and API updates
