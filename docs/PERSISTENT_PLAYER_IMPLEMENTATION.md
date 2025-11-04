# Persistent Audio Player Implementation Plan

**Goal:** Implement a Marketplace.org-style persistent audio player that stays at the top of the app across all pages, providing continuous audio playback while users navigate.

**Raindrop Integration:** Use standard Next.js/React patterns for client-side state with optional SmartSQL for cross-device sync.

---

## Raindrop Platform Research Summary

### Key Findings:
1. **Raindrop SmartMemory** - Not suitable for client-side audio state (designed for AI agent memory)
2. **Client-Side State** - Raindrop doesn't provide client-side state management; use React Context + localStorage
3. **Audio Caching** - Audio served directly from Vultr CDN (no Raindrop-specific caching needed)
4. **Cross-Device Sync** - Optional SmartSQL integration for syncing playback across devices
5. **Current Implementation** - Your `enhanced-audio-player.tsx` already uses localStorage correctly

### Recommended Architecture:
```
┌─────────────────────────────────────────────────────────────┐
│                    Client-Side (Browser)                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         React Context (Global Audio State)              │ │
│  │  • Current playing brief                                │ │
│  │  • Playback position                                    │ │
│  │  • Playing/paused state                                 │ │
│  │  • Volume, playback rate                                │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│  ┌────────────────▼───────────────────────────────────────┐ │
│  │         localStorage (Persistence)                      │ │
│  │  • Save playback position every 5s                      │ │
│  │  • Restore on mount                                     │ │
│  │  • Sync across browser tabs (storage event)             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                           │
                           │ (Optional: Cross-device sync)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│          Raindrop SmartSQL (Optional Server-Side)             │
│  • User playback history                                     │
│  • Last played brief (synced across devices)                 │
│  • Listening statistics & analytics                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Overview

### Current State
- Audio player is embedded **inside** the brief detail page (`/briefs/[id]`)
- Player disappears when navigating away
- No continuous listening experience
- Full-featured player with transcript, controls, etc.

### Target State (Marketplace.org Style)
- **Persistent mini-player bar** at the very top of the app
- Visible across **all pages** (briefs list, dashboard, settings, etc.)
- "Listen Now" buttons on brief cards/pages load audio into persistent player
- Audio continues playing while user navigates
- Compact design: Title, play/pause, skip ±15s, progress bar, volume, close
- Dark theme matching Marketplace.org aesthetic

---

## Architecture

### 1. Global Audio State Management
**Use React Context** to manage audio player state across the entire app

**State to Track:**
- `currentBrief`: Currently playing brief (id, title, audioUrl, duration)
- `isPlaying`: Boolean for play/pause state
- `currentTime`: Current playback position
- `volume`: Volume level (0-1)
- `isPlayerVisible`: Whether persistent player is shown

**Actions:**
- `playBrief(brief)`: Load and play a new brief
- `togglePlayPause()`: Play/pause current audio
- `seek(time)`: Jump to specific time
- `skipForward(seconds)`: Skip ahead
- `skipBackward(seconds)`: Skip back
- `setVolume(level)`: Adjust volume
- `closePlayer()`: Hide player and stop audio

---

## Implementation Tasks

### Phase 1: Audio Context & State Management

#### Task 1.1: Create Audio Context (Raindrop-Aware)
**File:** `contexts/audio-player-context.tsx`

```typescript
'use client';

import { createContext, useContext, useReducer, useRef, useEffect } from 'react';

interface Brief {
  id: string;
  title: string;
  audio_url: string;
  duration: number;
  featured_image_url?: string;
}

interface AudioState {
  currentBrief: Brief | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isPlayerVisible: boolean;
}

interface AudioContextValue extends AudioState {
  // Actions
  playBrief: (brief: Brief) => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  skip: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  closePlayer: () => void;
}

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

type AudioAction =
  | { type: 'PLAY_BRIEF'; brief: Brief }
  | { type: 'TOGGLE_PLAY_PAUSE' }
  | { type: 'UPDATE_TIME'; time: number }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SEEK'; time: number }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'SET_PLAYBACK_RATE'; rate: number }
  | { type: 'CLOSE_PLAYER' };

function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'PLAY_BRIEF':
      return { ...state, currentBrief: action.brief, isPlaying: true, isPlayerVisible: true };
    case 'TOGGLE_PLAY_PAUSE':
      return { ...state, isPlaying: !state.isPlaying };
    case 'UPDATE_TIME':
      return { ...state, currentTime: action.time };
    case 'SET_DURATION':
      return { ...state, duration: action.duration };
    case 'SEEK':
      return { ...state, currentTime: action.time };
    case 'SET_VOLUME':
      return { ...state, volume: action.volume };
    case 'SET_PLAYBACK_RATE':
      return { ...state, playbackRate: action.rate };
    case 'CLOSE_PLAYER':
      return { ...state, isPlayerVisible: false, isPlaying: false };
    default:
      return state;
  }
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(audioReducer, {
    currentBrief: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isPlayerVisible: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('hakivo-audio-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currentBrief) {
          dispatch({ type: 'PLAY_BRIEF', brief: parsed.currentBrief });
          dispatch({ type: 'TOGGLE_PLAY_PAUSE' }); // Start paused
          dispatch({ type: 'SEEK', time: parsed.currentTime || 0 });
          dispatch({ type: 'SET_VOLUME', volume: parsed.volume || 1 });
          dispatch({ type: 'SET_PLAYBACK_RATE', rate: parsed.playbackRate || 1 });
        }
      } catch (e) {
        console.error('Failed to restore audio state:', e);
      }
    }
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    if (state.currentBrief) {
      localStorage.setItem('hakivo-audio-state', JSON.stringify({
        currentBrief: state.currentBrief,
        currentTime: state.currentTime,
        volume: state.volume,
        playbackRate: state.playbackRate,
      }));
    }
  }, [state.currentBrief, state.currentTime, state.volume, state.playbackRate]);

  // Sync across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hakivo-audio-state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.currentBrief?.id !== state.currentBrief?.id) {
            dispatch({ type: 'PLAY_BRIEF', brief: parsed.currentBrief });
            dispatch({ type: 'TOGGLE_PLAY_PAUSE' }); // Pause in other tabs
          }
        } catch (e) {
          console.error('Failed to sync audio state:', e);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [state.currentBrief]);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();

      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          dispatch({ type: 'UPDATE_TIME', time: audioRef.current.currentTime });
        }
      });

      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          dispatch({ type: 'SET_DURATION', duration: audioRef.current.duration });
        }
      });

      audioRef.current.addEventListener('ended', () => {
        dispatch({ type: 'TOGGLE_PLAY_PAUSE' });
      });
    }
  }, []);

  // Update audio element when state changes
  useEffect(() => {
    if (!audioRef.current) return;

    if (state.currentBrief && audioRef.current.src !== state.currentBrief.audio_url) {
      audioRef.current.src = state.currentBrief.audio_url;
      audioRef.current.load();
    }

    if (state.isPlaying) {
      audioRef.current.play().catch(console.error);
    } else {
      audioRef.current.pause();
    }

    audioRef.current.volume = state.volume;
    audioRef.current.playbackRate = state.playbackRate;
  }, [state.currentBrief, state.isPlaying, state.volume, state.playbackRate]);

  // Media Session API
  useEffect(() => {
    if ('mediaSession' in navigator && state.currentBrief) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: state.currentBrief.title,
        artist: 'HakiVo Daily Brief',
        artwork: state.currentBrief.featured_image_url
          ? [{ src: state.currentBrief.featured_image_url, sizes: '512x512', type: 'image/jpeg' }]
          : undefined,
      });

      navigator.mediaSession.setActionHandler('play', () => dispatch({ type: 'TOGGLE_PLAY_PAUSE' }));
      navigator.mediaSession.setActionHandler('pause', () => dispatch({ type: 'TOGGLE_PLAY_PAUSE' }));
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        const newTime = Math.max(0, state.currentTime - 15);
        dispatch({ type: 'SEEK', time: newTime });
        if (audioRef.current) audioRef.current.currentTime = newTime;
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        const newTime = Math.min(state.duration, state.currentTime + 15);
        dispatch({ type: 'SEEK', time: newTime });
        if (audioRef.current) audioRef.current.currentTime = newTime;
      });
    }
  }, [state.currentBrief, state.currentTime, state.duration]);

  const value: AudioContextValue = {
    ...state,
    playBrief: (brief) => dispatch({ type: 'PLAY_BRIEF', brief }),
    togglePlayPause: () => dispatch({ type: 'TOGGLE_PLAY_PAUSE' }),
    seek: (time) => {
      dispatch({ type: 'SEEK', time });
      if (audioRef.current) audioRef.current.currentTime = time;
    },
    skip: (seconds) => {
      const newTime = Math.max(0, Math.min(state.duration, state.currentTime + seconds));
      dispatch({ type: 'SEEK', time: newTime });
      if (audioRef.current) audioRef.current.currentTime = newTime;
    },
    setVolume: (volume) => dispatch({ type: 'SET_VOLUME', volume }),
    setPlaybackRate: (rate) => dispatch({ type: 'SET_PLAYBACK_RATE', rate }),
    closePlayer: () => {
      dispatch({ type: 'CLOSE_PLAYER' });
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      localStorage.removeItem('hakivo-audio-state');
    },
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudioPlayer() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
}
```

**Raindrop-Specific Considerations:**
- ✅ Uses standard React Context (Raindrop doesn't provide client-side state management)
- ✅ localStorage for browser persistence (already proven in your enhanced-audio-player.tsx)
- ✅ Media Session API for mobile lock screen controls
- ✅ Sync across browser tabs using storage events
- 🔄 Optional: Future SmartSQL integration for cross-device sync (Phase 5)

**Requirements:**
- Use `useReducer` for complex state management ✅
- Use `useRef` for HTML audio element ✅
- Persist playback position to localStorage ✅
- Handle Media Session API for mobile lock screen controls ✅
- Save last played brief to localStorage ✅
- Audio element managed in context (never unmounts during navigation) ✅

**Estimated Time:** 3 hours (includes Raindrop integration planning)

---

#### Task 1.2: Wrap App with Audio Provider
**File:** `app/layout.tsx`

```typescript
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AudioPlayerProvider>
          <PersistentAudioPlayer /> {/* Always rendered at top */}
          {children}
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
```

**Requirements:**
- Provider wraps entire app
- Persistent player component always rendered
- Children (pages) can access context

**Estimated Time:** 30 minutes

---

### Phase 2: Persistent Player Component

#### Task 2.1: Create Persistent Player UI
**File:** `components/audio/persistent-player.tsx`

**Design Specs (Marketplace.org Style):**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔙15  ▶️  🔜15  "Trump administration to pay..."  ━━━━━━━ 🔊 ✕ │
│              Progress: 00:04 ━━━━━━━━━━━━━━━━━━━━━━━━━━ 02:08    │
└─────────────────────────────────────────────────────────────────┘
```

**Layout:**
- Height: ~80px on desktop, ~60px on mobile
- Background: Dark blue/navy (like Marketplace.org)
- Fixed position at top: `position: fixed; top: 0; z-index: 50`
- Slide down animation when audio loads
- Slide up animation when closed

**Controls (Left to Right):**
1. Skip back 15s button
2. Play/Pause button (larger, centered)
3. Skip forward 15s button
4. Brief title (truncated with ellipsis)
5. Progress bar with time labels
6. Volume slider (desktop only)
7. Close button (X)

**Mobile Adaptations:**
- Stack controls vertically if needed
- Hide volume slider (use device volume)
- Larger touch targets (44x44px minimum)

**Estimated Time:** 3 hours

---

#### Task 2.2: Implement Player Logic
**Requirements:**
- Connect to AudioContext
- Handle play/pause/skip/volume changes
- Update progress bar in real-time
- Save playback position every 5 seconds
- Handle audio ended event
- Keyboard shortcuts (Space, Left, Right arrows)

**Estimated Time:** 2 hours

---

#### Task 2.3: Add Animations
**Animations:**
- Slide down from top when audio loads (300ms ease-out)
- Slide up when closed (300ms ease-in)
- Progress bar smooth updates (no jank)
- Button hover states
- Loading spinner while buffering

**Use:** Framer Motion or CSS transitions

**Estimated Time:** 1 hour

---

### Phase 3: Listen Now Buttons

#### Task 3.1: Update Brief Cards
**File:** `components/briefs/brief-card.tsx`

**Changes:**
- Replace current play button with "Listen Now" button
- On click: Call `playBrief(brief)` from context
- Button style: Black background, white text (Marketplace style)
- Icon: Play icon + "LISTEN NOW" text

**Example:**
```typescript
const { playBrief } = useAudioPlayer();

<Button
  onClick={(e) => {
    e.preventDefault(); // Don't navigate to detail page
    playBrief(brief);
  }}
  className="bg-black text-white hover:bg-gray-800"
>
  <Play className="w-4 h-4 mr-2" />
  LISTEN NOW
</Button>
```

**Estimated Time:** 1 hour

---

#### Task 3.2: Update Brief Detail Page
**File:** `app/(authenticated)/briefs/[id]/page.tsx`

**Changes:**
- Move "Listen Now" button near title (hero section)
- Remove embedded audio player from page content
- Keep transcript, written digest, etc.
- User clicks "Listen Now" → persistent player loads at top

**Layout:**
```
┌─────────────────────────────────────────────┐
│ [Featured Image]                            │
│                                             │
│ [Policy Tags]                               │
│ Title: "Trump administration..."            │
│                                             │
│ [▶️ LISTEN NOW]  [Save] [Share] [Download] │
│                                             │
│ [Written Digest Content...]                 │
│ [Show Transcript Button]                    │
└─────────────────────────────────────────────┘
```

**Estimated Time:** 1 hour

---

### Phase 4: Layout Adjustments

#### Task 4.1: Adjust Page Padding
**Files:** `app/layout.tsx`, `app/(authenticated)/layout.tsx`

**Changes:**
- Add top padding to content area when player is visible
- Padding should match player height (80px desktop, 60px mobile)
- Use dynamic class: `pt-20 when player visible`

**Example:**
```typescript
const { isPlayerVisible } = useAudioPlayer();

<main className={cn(
  "min-h-screen",
  isPlayerVisible && "pt-20" // Prevent content from hiding under player
)}>
  {children}
</main>
```

**Estimated Time:** 30 minutes

---

#### Task 4.2: Handle Header/Nav Overlap
**Current header might overlap with persistent player**

**Solution:**
- If header is also fixed at top: Move down by player height
- Or: Make header relative, start below player
- Test on all pages: dashboard, briefs list, briefs detail, settings

**Estimated Time:** 1 hour

---

### Phase 5: Advanced Features

#### Task 5.1: Cross-Device Sync with Raindrop SmartSQL (Optional)
**Enable playback state sync across devices using Raindrop's SmartSQL**

**Database Schema:**
```sql
-- Migration: Add user_playback_state table
CREATE TABLE IF NOT EXISTS user_playback_state (
  user_id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL,
  current_time REAL NOT NULL DEFAULT 0,
  volume REAL NOT NULL DEFAULT 1.0,
  playback_rate REAL NOT NULL DEFAULT 1.0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (brief_id) REFERENCES briefs(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX idx_user_playback_user_id ON user_playback_state(user_id);
```

**API Routes:**
```typescript
// app/api/playback/sync/route.ts
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/client';
import { getSession } from '@/lib/auth/session';

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { briefId, currentTime, volume, playbackRate } = await req.json();

  await executeQuery(
    `INSERT INTO user_playback_state (user_id, brief_id, current_time, volume, playback_rate, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       brief_id = excluded.brief_id,
       current_time = excluded.current_time,
       volume = excluded.volume,
       playback_rate = excluded.playback_rate,
       updated_at = CURRENT_TIMESTAMP`,
    [user.id, briefId, currentTime, volume, playbackRate],
    'users'
  );

  return NextResponse.json({ success: true });
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await executeQuery(
    `SELECT ups.*, b.title, b.audio_url, b.duration, b.featured_image_url
     FROM user_playback_state ups
     JOIN briefs b ON ups.brief_id = b.id
     WHERE ups.user_id = ?
     LIMIT 1`,
    [user.id],
    'users'
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ playbackState: null });
  }

  return NextResponse.json({ playbackState: result.rows[0] });
}
```

**Client-Side Integration:**
```typescript
// In AudioPlayerProvider
useEffect(() => {
  // Fetch from server on mount (if authenticated)
  async function fetchServerState() {
    try {
      const res = await fetch('/api/playback/sync');
      const { playbackState } = await res.json();

      if (playbackState && playbackState.brief_id) {
        // Server state overrides localStorage if newer
        const localState = localStorage.getItem('hakivo-audio-state');
        const localUpdated = localState ? JSON.parse(localState).updatedAt : 0;
        const serverUpdated = new Date(playbackState.updated_at).getTime();

        if (serverUpdated > localUpdated) {
          dispatch({ type: 'PLAY_BRIEF', brief: {
            id: playbackState.brief_id,
            title: playbackState.title,
            audio_url: playbackState.audio_url,
            duration: playbackState.duration,
            featured_image_url: playbackState.featured_image_url,
          }});
          dispatch({ type: 'SEEK', time: playbackState.current_time });
          dispatch({ type: 'SET_VOLUME', volume: playbackState.volume });
          dispatch({ type: 'SET_PLAYBACK_RATE', rate: playbackState.playback_rate });
          dispatch({ type: 'TOGGLE_PLAY_PAUSE' }); // Start paused
        }
      }
    } catch (e) {
      console.error('Failed to fetch server playback state:', e);
    }
  }

  fetchServerState();
}, []);

// Sync to server every 10 seconds
useEffect(() => {
  if (!state.currentBrief || !state.isPlaying) return;

  const interval = setInterval(async () => {
    try {
      await fetch('/api/playback/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefId: state.currentBrief.id,
          currentTime: state.currentTime,
          volume: state.volume,
          playbackRate: state.playbackRate,
        }),
      });
    } catch (e) {
      console.error('Failed to sync playback state:', e);
    }
  }, 10000); // Every 10 seconds

  return () => clearInterval(interval);
}, [state.currentBrief, state.isPlaying, state.currentTime, state.volume, state.playbackRate]);
```

**Benefits:**
- 📱 Resume playback across devices (phone → laptop → tablet)
- ☁️ Backup in case localStorage is cleared
- 📊 Analytics: Track listening habits, completion rates
- 🔄 Seamless experience for authenticated users

**Implementation Notes:**
- Only sync for authenticated users
- localStorage still works for non-authenticated users
- Server sync is optional enhancement (can ship without it)
- Use Raindrop's `executeQuery()` helper (already in codebase)

**Estimated Time:** 3 hours (includes migration, API routes, client integration)

---

#### Task 5.2: Media Session API (Mobile)
**Integrate with OS media controls**

**Features:**
- Lock screen controls (play, pause, skip)
- Notification tray controls (Android/iOS)
- Bluetooth/car controls
- Display brief title and artwork

**Implementation:**
```typescript
if ('mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: brief.title,
    artist: 'HakiVo Daily Brief',
    artwork: [
      { src: brief.featured_image_url, sizes: '512x512' }
    ]
  });

  navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
  navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
  navigator.mediaSession.setActionHandler('seekbackward', () => skip(-15));
  navigator.mediaSession.setActionHandler('seekforward', () => skip(15));
}
```

**Estimated Time:** 1 hour

---

#### Task 5.3: Playlist/Queue System (Optional)
**Allow users to queue multiple briefs**

**Features:**
- "Add to queue" button on brief cards
- Auto-play next brief when current ends
- Skip to next/previous brief in queue
- View queue in player (expandable)

**Estimated Time:** 3 hours (if implemented)

---

### Phase 6: Testing & Polish

#### Task 6.1: Cross-Page Navigation Testing
**Test scenarios:**
1. Play brief on briefs list → navigate to dashboard → audio continues
2. Play brief on detail page → navigate to settings → audio continues
3. Navigate back to brief detail page → player shows, audio continues
4. Close player → audio stops, player hides
5. Refresh page → last brief restored (paused)

**Estimated Time:** 2 hours

---

#### Task 6.2: Mobile Testing
**Test on actual devices:**
- iOS Safari (iPhone)
- Android Chrome
- Tablet (iPad)

**Check:**
- Lock screen controls work
- Touch targets are large enough
- Player doesn't overlap important content
- Responsive layout adjustments

**Estimated Time:** 2 hours

---

#### Task 6.3: Accessibility
**Requirements:**
- Keyboard navigation (Tab, Enter, Space, Arrow keys)
- Screen reader support (aria-labels)
- Focus management
- High contrast mode support

**Test with:**
- VoiceOver (macOS/iOS)
- NVDA (Windows)
- Keyboard-only navigation

**Estimated Time:** 2 hours

---

## File Structure

```
app/
├── layout.tsx                              # Wrap with AudioPlayerProvider
├── (authenticated)/
│   ├── layout.tsx                          # Add padding for player
│   ├── briefs/
│   │   ├── page.tsx                        # Brief cards with Listen Now
│   │   └── [id]/page.tsx                   # Detail page with Listen Now
│   └── dashboard/page.tsx                  # Works with persistent player
│
components/
├── audio/
│   ├── persistent-player.tsx               # NEW: Top bar player
│   └── audio-context.tsx                   # NEW: Global audio state
│
contexts/
└── audio-player-context.tsx                # NEW: Audio provider

types/
└── audio.ts                                # NEW: Audio state types
```

---

## Design References

### Marketplace.org Player Anatomy
```
┌──────────────────────────────────────────────────────────────────────┐
│  [🔙15]  [▶️]  [🔜15]  "Title truncated..."  ━━━━━━━━  [🔊]  [✕]   │
│           00:04 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 02:08            │
└──────────────────────────────────────────────────────────────────────┘
```

**Colors:**
- Background: `#1a1d29` (dark navy)
- Text: `#ffffff` (white)
- Progress bar: `#3b82f6` (blue)
- Buttons: `#ffffff` on hover `#f3f4f6`

**Typography:**
- Title: 14px, font-semibold
- Time: 12px, text-muted

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Audio Context | 2 tasks | 2.5 hours |
| Phase 2: Persistent Player | 3 tasks | 6 hours |
| Phase 3: Listen Now Buttons | 2 tasks | 2 hours |
| Phase 4: Layout Adjustments | 2 tasks | 1.5 hours |
| Phase 5: Advanced Features | 2 tasks | 2 hours |
| Phase 6: Testing & Polish | 3 tasks | 6 hours |
| **Total** | **14 tasks** | **~20 hours** |

---

## Success Criteria

### Must Have (MVP)
- ✅ Persistent player bar at top of app
- ✅ Visible across all pages
- ✅ Play/pause, skip ±15s controls
- ✅ Progress bar with time display
- ✅ "Listen Now" buttons on brief cards
- ✅ "Listen Now" button on detail page
- ✅ Audio continues during navigation
- ✅ Close button hides player

### Should Have
- ✅ Volume control (desktop)
- ✅ Playback state persistence (localStorage)
- ✅ Slide animations (show/hide player)
- ✅ Keyboard shortcuts
- ✅ Media Session API (mobile controls)
- ✅ Responsive design (mobile/tablet/desktop)

### Nice to Have
- ⏸️ Playlist/queue system
- ⏸️ Auto-play next brief
- ⏸️ Expandable player with full controls
- ⏸️ Playback speed control
- ⏸️ Share "Listen Now" link (deep link to audio)

---

## Technical Decisions

### Why React Context?
- **Pros:** Native React, simple API, no extra dependencies
- **Cons:** Re-renders if not optimized
- **Alternative:** Zustand (more performant, but adds dependency)

**Decision:** Use React Context with careful optimization (useMemo, useCallback)

---

### Why Fixed Position Player?
- **Pros:** Always visible, doesn't affect page layout
- **Cons:** Can overlap content if not handled

**Solution:** Add top padding to main content equal to player height

---

### Why NOT use full EnhancedAudioPlayer?
- Too large for persistent bar
- Has transcript, citations, etc. (not needed in mini player)
- Better to create lightweight component

**Decision:** Create new `PersistentPlayer` component specifically for top bar

---

## Migration Strategy

### How to Keep Existing Player?
**Option 1: Remove detail page player entirely**
- Simpler, cleaner
- Users use persistent player only

**Option 2: Keep both players (not recommended)**
- Confusing UX
- Two players competing for same audio
- Hard to sync state

**Decision:** Remove embedded player from detail page, use persistent player only

---

## Risks & Mitigations

### Risk 1: Audio stops when navigating (SPA issue)
**Mitigation:** Audio element lives in context provider (parent of all pages), never unmounts

### Risk 2: Multiple audio elements playing
**Mitigation:** Only one audio element in AudioContext, controlled globally

### Risk 3: Player overlaps important content
**Mitigation:** Add top padding to content area dynamically

### Risk 4: Mobile audio autoplay restrictions
**Mitigation:** Require user interaction (click "Listen Now") to start audio

---

## Next Steps

1. **Review & Approve** this plan
2. **Start with Phase 1:** Audio Context implementation
3. **Iterative development:** Build, test, refine each phase
4. **User testing:** Get feedback on UX/UI
5. **Polish & ship:** Final testing and deployment

---

**Questions? Feedback? Let's discuss before implementation!**
