# Press Releases Implementation Guide

## ✅ What's Been Implemented

You now have a complete system to fetch and display congressional press releases:

1. **Library** (`lib/congress/press-releases.ts`)
   - Fetches RSS feeds from House.gov, Senate.gov, or custom rep websites
   - Automatically tries multiple URL patterns
   - Includes known RSS feeds for Wisconsin reps

2. **API Endpoint** (`/api/representatives/[bioguideId]/press-releases`)
   - Server-side RSS fetching (no CORS issues)
   - 6-hour cache for performance
   - Returns structured JSON

3. **React Component** (`components/representative/press-releases.tsx`)
   - Beautiful card-based UI
   - Loading states and error handling
   - Source badges (House.gov/Senate.gov)
   - External links to full releases

4. **Documentation**
   - How to find RSS feeds manually (`docs/finding-representative-rss-feeds.md`)
   - Twitter alternatives guide (`docs/twitter-alternatives.md`)

---

## 🚀 How to Use

### Step 1: Add to Representative Page

Find your representative detail page (likely `app/representatives/[bioguideId]/page.tsx` or similar):

```typescript
// app/representatives/[bioguideId]/page.tsx

import { PressReleases } from '@/components/representative/press-releases';

export default async function RepresentativePage({ params }: { params: { bioguideId: string } }) {
  const { bioguideId } = params;

  // ... existing code to fetch representative data

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Representative info, bills, voting record, etc. */}
        </div>

        {/* Right column: Sidebar */}
        <div className="space-y-6">
          {/* ADD PRESS RELEASES HERE */}
          <PressReleases bioguideId={bioguideId} limit={5} />

          {/* Other sidebar widgets */}
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Test It Out

1. **Visit a representative page:**
   ```
   http://localhost:3000/representatives/M001160
   ```
   (Replace M001160 with Gwen Moore's bioguide ID or any Wisconsin rep)

2. **Check server logs** to see if RSS feeds are being fetched:
   ```
   📰 Fetching press releases for Moore (House)
   ✅ Found 15 press releases from https://gwenmoore.house.gov/rss.xml
   ```

3. **If no press releases show:**
   - Check server logs for errors
   - Verify RSS feed URL in browser: `https://gwenmoore.house.gov/rss.xml`
   - Add working feed to `KNOWN_RSS_FEEDS` in `lib/congress/press-releases.ts`

---

## 🧪 Testing Individual RSS Feeds

Create a test script:

```bash
# Create test script
cat > scripts/test-press-releases.ts << 'EOF'
import { fetchRepresentativePressReleases } from '@/lib/congress/press-releases';

async function test() {
  console.log('Testing press releases for Gwen Moore...\n');

  const releases = await fetchRepresentativePressReleases({
    lastName: 'Moore',
    chamber: 'House'
  }, 5);

  console.log(`\nFound ${releases.length} press releases:\n`);

  releases.forEach((release, i) => {
    console.log(`${i + 1}. ${release.title}`);
    console.log(`   Published: ${release.publishedAt}`);
    console.log(`   URL: ${release.url}\n`);
  });
}

test();
EOF

# Run test
npx tsx scripts/test-press-releases.ts
```

---

## 📋 Adding More Representatives

### Option 1: Manual Discovery

1. Visit representative's website (e.g., `https://gwenmoore.house.gov`)
2. Look for RSS icon or "Subscribe" link
3. Copy RSS feed URL
4. Add to `KNOWN_RSS_FEEDS`:

```typescript
// lib/congress/press-releases.ts

export const KNOWN_RSS_FEEDS: Record<string, string> = {
  'Moore': 'https://gwenmoore.house.gov/rss.xml',
  'NewRep': 'https://newrep.house.gov/rss.xml', // <-- Add here
};
```

### Option 2: Automated Discovery Script

```bash
# Create discovery script
cat > scripts/discover-rss-feeds.ts << 'EOF'
import Parser from 'rss-parser';
import { fetchMembers } from '@/lib/api/congress';

async function discoverFeeds() {
  const members = await fetchMembers({ currentMember: true });
  const parser = new Parser({ timeout: 5000 });

  for (const member of members.slice(0, 10)) { // Test first 10
    const url = member.chamber === 'House'
      ? `https://${member.lastName.toLowerCase()}.house.gov/rss.xml`
      : `https://www.${member.lastName.toLowerCase()}.senate.gov/rss/feeds/?type=press`;

    try {
      await parser.parseURL(url);
      console.log(`✅ ${member.name}: ${url}`);
    } catch {
      console.log(`❌ ${member.name}: No feed found`);
    }
  }
}

discoverFeeds();
EOF

npx tsx scripts/discover-rss-feeds.ts
```

---

## 🎨 Customization Options

### Change Number of Press Releases Shown

```tsx
// Show more press releases
<PressReleases bioguideId={bioguideId} limit={10} />
```

### Customize Styling

The component uses shadcn/ui components, so you can modify:

```tsx
// components/representative/press-releases.tsx

// Change card appearance
<Card className="shadow-lg"> // Add shadow

// Change badge colors
<Badge variant="default" className="bg-blue-500"> // Custom color

// Adjust spacing
<div className="space-y-6"> // More space between releases
```

### Add to Dashboard Widget

```tsx
// components/dashboard/rep-press-releases-widget.tsx

export function RepPressReleasesWidget() {
  const userReps = useUserRepresentatives();

  return (
    <div className="grid gap-4">
      {userReps.map(rep => (
        <PressReleases key={rep.bioguideId} bioguideId={rep.bioguideId} limit={3} />
      ))}
    </div>
  );
}
```

---

## 🚨 Troubleshooting

### Issue 1: "No press releases available"

**Cause:** RSS feed not found for this representative

**Solutions:**
1. Check if rep has RSS feed: Visit `https://[lastname].house.gov/rss.xml` in browser
2. Try alternative patterns (see `docs/finding-representative-rss-feeds.md`)
3. Add working URL to `KNOWN_RSS_FEEDS`

### Issue 2: "Failed to fetch press releases"

**Cause:** Network error or RSS feed down

**Solutions:**
1. Check server logs for detailed error
2. Test RSS URL directly in browser
3. Try again later (rep's website may be down)

### Issue 3: CORS errors in browser console

**Cause:** Trying to fetch RSS from client-side

**Solution:** ✅ Already handled! The API endpoint fetches server-side, so no CORS issues.

### Issue 4: Slow loading

**Cause:** Fetching multiple RSS feeds takes time

**Solutions:**
1. ✅ Already implemented: 6-hour cache on API endpoint
2. Add loading skeleton while fetching
3. Consider background job to pre-fetch and cache in database

---

## 🔄 Optional: Background Caching Job

For better performance, pre-fetch all rep press releases:

```typescript
// scripts/cache-all-press-releases.ts

import { fetchMembers } from '@/lib/api/congress';
import { fetchRepresentativePressReleases } from '@/lib/congress/press-releases';
import { db } from '@/lib/db';

async function cacheAllPressReleases() {
  const members = await fetchMembers({ currentMember: true });

  for (const member of members) {
    try {
      const releases = await fetchRepresentativePressReleases({
        lastName: member.lastName,
        chamber: member.chamber,
        websiteUrl: member.websiteUrl
      }, 10);

      // Store in database
      for (const release of releases) {
        await db.execute(`
          INSERT INTO representative_press_releases (
            bioguide_id, release_id, title, excerpt, url, published_at, source, fetched_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (release_id) DO UPDATE SET
            title = excluded.title,
            excerpt = excluded.excerpt,
            fetched_at = excluded.fetched_at
        `, [
          member.bioguideId,
          release.id,
          release.title,
          release.excerpt,
          release.url,
          release.publishedAt,
          release.source,
          new Date().toISOString()
        ]);
      }

      console.log(`✅ Cached ${releases.length} press releases for ${member.name}`);
    } catch (error) {
      console.error(`❌ Failed to cache for ${member.name}:`, error);
    }
  }
}

cacheAllPressReleases();
```

Run daily via cron:
```bash
# Crontab entry (runs daily at 6am)
0 6 * * * cd /app && npx tsx scripts/cache-all-press-releases.ts
```

---

## ✅ Summary

You now have:

✅ **FREE** press release fetching (no API costs)
✅ **Official sources** (House.gov, Senate.gov)
✅ **Auto-discovery** of RSS feeds
✅ **Beautiful UI** with loading states
✅ **Server-side caching** (6-hour cache)
✅ **Easy to customize**

**Next steps:**
1. Add `<PressReleases>` component to representative pages
2. Test with Wisconsin reps (all have working RSS feeds)
3. (Optional) Implement background caching job for better performance
4. (Optional) Add to dashboard as "Your Reps' Latest News" widget

**Cost:** $0/month (vs $100+/month for Twitter API)

🎉 **You're done!**
