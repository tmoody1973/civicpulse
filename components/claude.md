# Components - Patterns & Standards

## Component Structure

```
components/
├── ui/                    # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── podcast/              # Podcast features
│   ├── player.tsx
│   ├── episode-card.tsx
│   └── transcript.tsx
├── dashboard/            # Dashboard features
│   ├── bill-card.tsx
│   └── rep-card.tsx
└── shared/               # Shared components
    ├── header.tsx
    └── footer.tsx
```

---

## Component Template

```typescript
// components/[feature]/[name].tsx

import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

interface Props extends ComponentProps<'div'> {
  title: string;
  description?: string;
}

export function ComponentName({ title, description, className, ...props }: Props) {
  return (
    <div className={cn('base-classes', className)} {...props}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
```

---

## Podcast Player

```typescript
// components/podcast/player.tsx

'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';

interface Props {
  src: string;
  title: string;
  onEnded?: () => void;
}

export function PodcastPlayer({ src, title, onEnded }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Media Session API for mobile controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: 'Civic Pulse',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
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
    }
  }, [title]);
  
  const handlePlay = () => {
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setPlaying(!playing);
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
      />
      
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={handlePlay}
            size="lg"
            className="min-w-[44px] min-h-[44px]" // Touch-friendly
          >
            {playing ? <Pause /> : <Play />}
          </Button>
          
          <div className="flex-1">
            <div className="font-semibold truncate">{title}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formatTime(progress)}</span>
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(progress / duration) * 100}%` }}
                />
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

---

## Episode Card

```typescript
// components/podcast/episode-card.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  title: string;
  type: 'daily' | 'weekly';
  duration: number;
  generatedAt: Date;
  billsCovered: Array<{ id: string; title: string }>;
  onPlay: () => void;
}

export function EpisodeCard({
  title,
  type,
  duration,
  generatedAt,
  billsCovered,
  onPlay
}: Props) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <span className="text-xs text-muted-foreground capitalize">
            {type}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDistanceToNow(generatedAt, { addSuffix: true })}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {Math.round(duration / 60)} min
          </div>
        </div>
        
        <div>
          <p className="text-sm font-medium mb-2">Bills Covered:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {billsCovered.map(bill => (
              <li key={bill.id} className="truncate">• {bill.title}</li>
            ))}
          </ul>
        </div>
        
        <Button onClick={onPlay} className="w-full">
          Listen Now
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## Bill Card

```typescript
// components/dashboard/bill-card.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  billNumber: string;
  title: string;
  summary: string;
  issueCategories: string[];
  impactScore: number;
}

export function BillCard({
  billNumber,
  title,
  summary,
  issueCategories,
  impactScore
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base">
            {billNumber}: {title}
          </CardTitle>
          <Badge variant={impactScore > 70 ? 'destructive' : 'secondary'}>
            Impact: {impactScore}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {summary}
        </p>
        
        <div className="flex flex-wrap gap-2">
          {issueCategories.map(category => (
            <Badge key={category} variant="outline">
              {category}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Style Guidelines

### Tailwind Classes
```typescript
// Use cn() utility for conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  'base classes always applied',
  isActive && 'conditional-class',
  className // Allow parent to override
)} />
```

### Spacing
- Gap: `gap-2` (8px), `gap-4` (16px), `gap-6` (24px)
- Padding: `p-2` (8px), `p-4` (16px), `p-6` (24px)
- Margin: Use sparingly, prefer gap/space utilities

### Colors
- Primary: `bg-primary text-primary-foreground`
- Secondary: `bg-secondary text-secondary-foreground`
- Muted: `bg-muted text-muted-foreground`
- Destructive: `bg-destructive text-destructive-foreground`

### Typography
- Headings: `text-lg font-semibold`, `text-base font-medium`
- Body: `text-sm`, `text-base`
- Muted: `text-sm text-muted-foreground`

---

## Responsive Design

### Mobile-First Approach
```typescript
<div className="
  grid grid-cols-1        // Mobile: single column
  md:grid-cols-2          // Tablet: 2 columns
  lg:grid-cols-3          // Desktop: 3 columns
  gap-4
">
```

### Breakpoints
- **sm:** 640px (mobile landscape)
- **md:** 768px (tablet)
- **lg:** 1024px (desktop)
- **xl:** 1280px (large desktop)

### Touch Targets
```typescript
// Minimum 44x44px for touch
<Button className="min-w-[44px] min-h-[44px]">
```

---

## Performance

### Server Components (Default)
```typescript
// components/dashboard/stats.tsx
// No 'use client' = Server Component

export function Stats() {
  // Fetch data on server
  const stats = await getStats();
  return <div>{stats}</div>;
}
```

### Client Components (When Needed)
```typescript
'use client'; // Only when needed

// Use for:
// - Event handlers (onClick, onChange)
// - Hooks (useState, useEffect)
// - Browser APIs
// - Interactive components
```

### Lazy Loading
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./heavy-component'), {
  loading: () => <Skeleton />
});
```

---

## Accessibility

### Semantic HTML
```typescript
// Good
<button onClick={handleClick}>Click me</button>

// Bad
<div onClick={handleClick}>Click me</div>
```

### ARIA Labels
```typescript
<Button aria-label="Play podcast">
  <Play />
</Button>
```

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Use proper focus management
- Add focus styles (`focus-visible:ring-2`)

---

## Testing

```typescript
// __tests__/components/podcast-player.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { PodcastPlayer } from '@/components/podcast/player';

describe('PodcastPlayer', () => {
  it('renders play button', () => {
    render(<PodcastPlayer src="/test.mp3" title="Test" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
  
  it('toggles play/pause', () => {
    render(<PodcastPlayer src="/test.mp3" title="Test" />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
  });
});
```

---

## shadcn/ui Usage

### Adding Components
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
```

### Customizing
Edit `components/ui/[component].tsx` directly - these are your components, not a library

### Available Components
- Button, Card, Badge, Input, Label
- Dialog, Sheet, Popover, Dropdown Menu
- Select, Checkbox, Radio Group, Switch
- Tabs, Accordion, Collapsible
- Toast, Alert, Skeleton

---

**Always use shadcn/ui components. Keep components focused (single responsibility). Use Server Components by default.**
