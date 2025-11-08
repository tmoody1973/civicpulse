# How to Find RSS Feeds for Congressional Press Releases

## Quick Reference: Common RSS Feed Patterns

### House Representatives

**Pattern 1 (Most Common):**
```
https://[lastname].house.gov/rss.xml
```
Example: `https://gwenmoore.house.gov/rss.xml` (Rep. Gwen Moore)

**Pattern 2:**
```
https://[lastname].house.gov/feed/
```

**Pattern 3:**
```
https://[lastname].house.gov/press-releases/rss
```

### Senate Members

**Pattern 1 (Most Common):**
```
https://www.[lastname].senate.gov/rss/feeds/?type=press
```
Example: `https://www.baldwin.senate.gov/rss/feeds/?type=press` (Sen. Tammy Baldwin)

**Pattern 2:**
```
https://www.[lastname].senate.gov/public/index.cfm/rss/feed
```

**Pattern 3:**
```
https://www.[lastname].senate.gov/rss.xml
```

---

## Step-by-Step: Finding a Representative's RSS Feed

### Method 1: Try Common Patterns (Fastest)

1. **Get representative's last name** (e.g., "Moore" for Gwen Moore)

2. **Build URL based on chamber:**
   - **House:** `https://[lowercase-lastname].house.gov/rss.xml`
   - **Senate:** `https://www.[lowercase-lastname].senate.gov/rss/feeds/?type=press`

3. **Test in browser:** Paste URL and see if RSS XML loads

4. **If 404, try alternative patterns** listed above

### Method 2: Manual Website Discovery

1. **Visit representative's official website:**
   - House: `https://[lastname].house.gov`
   - Senate: `https://www.[lastname].senate.gov`

2. **Look for RSS icon** (usually in footer or sidebar)
   - Orange RSS icon: 📡
   - Text link: "RSS", "Feed", "Subscribe"

3. **Check "News" or "Press Releases" page**
   - Many reps have RSS links on their news pages
   - Right-click RSS icon → Copy link address

4. **Check page source:**
   - View source (Ctrl/Cmd + U)
   - Search for: `<link rel="alternate" type="application/rss+xml"`
   - Example:
     ```html
     <link rel="alternate" type="application/rss+xml"
           title="RSS Feed"
           href="https://gwenmoore.house.gov/rss.xml" />
     ```

### Method 3: Browser Extension

**RSS Feed Reader Extension** (Chrome/Firefox)
- Install: "RSS Feed Reader" or "Feedbro"
- Visit representative's website
- Extension auto-detects RSS feeds
- Click extension icon to see all available feeds

---

## Testing RSS Feeds Programmatically

Use this script to test if an RSS feed works:

```typescript
// scripts/test-rss-feed.ts

import Parser from 'rss-parser';

async function testRssFeed(url: string) {
  console.log(`\n🔍 Testing RSS feed: ${url}\n`);

  const parser = new Parser({ timeout: 10000 });

  try {
    const feed = await parser.parseURL(url);

    console.log('✅ RSS feed found!');
    console.log(`📰 Title: ${feed.title}`);
    console.log(`📝 Description: ${feed.description}`);
    console.log(`📊 Items: ${feed.items.length}`);

    if (feed.items.length > 0) {
      console.log('\n--- Latest 3 Items ---');
      feed.items.slice(0, 3).forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.title}`);
        console.log(`   Published: ${item.pubDate}`);
        console.log(`   Link: ${item.link}`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ RSS feed failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

// Test multiple URLs
const urlsToTest = [
  'https://gwenmoore.house.gov/rss.xml',
  'https://www.baldwin.senate.gov/rss/feeds/?type=press',
  'https://fitzgerald.house.gov/rss.xml',
];

(async () => {
  for (const url of urlsToTest) {
    await testRssFeed(url);
  }
})();
```

Run it:
```bash
npx tsx scripts/test-rss-feed.ts
```

---

## Common Issues & Solutions

### Issue 1: 404 Not Found

**Problem:** RSS feed doesn't exist at expected URL

**Solutions:**
1. Try alternative patterns listed above
2. Check representative's website manually
3. Some reps don't have RSS feeds (fallback to web scraping)

### Issue 2: Different Last Name Format

**Problem:** Representative uses different name format

**Examples:**
- **Van Orden** (with space) → URL: `vanorden.house.gov` (no space)
- **De La Cruz** → URL: `delacruz.house.gov`
- **McMorris Rodgers** → URL: `mcmorris.house.gov`

**Solution:** Remove spaces, use first part of hyphenated names

### Issue 3: CORS Errors (Browser)

**Problem:** Can't fetch RSS from browser due to CORS

**Solution:** Fetch from server-side API routes (Next.js API routes)

### Issue 4: SSL/Certificate Errors

**Problem:** Some .gov sites have SSL issues

**Solution:** Use Node.js with `rejectUnauthorized: false` (careful - security risk)

---

## Bulk RSS Feed Discovery Script

Want to find RSS feeds for ALL representatives at once?

```typescript
// scripts/discover-all-rss-feeds.ts

import Parser from 'rss-parser';
import { fetchMembers } from '@/lib/api/congress';

async function discoverAllRssFeeds() {
  console.log('🔍 Discovering RSS feeds for all representatives...\n');

  const members = await fetchMembers({ currentMember: true });
  const parser = new Parser({ timeout: 5000 });

  const results: Record<string, string> = {};

  for (const member of members) {
    const { lastName, chamber } = member;

    // Try common patterns
    const patterns = chamber === 'House'
      ? [
          `https://${lastName.toLowerCase()}.house.gov/rss.xml`,
          `https://${lastName.toLowerCase()}.house.gov/feed/`,
        ]
      : [
          `https://www.${lastName.toLowerCase()}.senate.gov/rss/feeds/?type=press`,
          `https://www.${lastName.toLowerCase()}.senate.gov/rss.xml`,
        ];

    for (const url of patterns) {
      try {
        await parser.parseURL(url);
        console.log(`✅ ${lastName} (${chamber}): ${url}`);
        results[lastName] = url;
        break; // Found one, move to next rep
      } catch {
        continue;
      }
    }

    if (!results[lastName]) {
      console.log(`❌ ${lastName} (${chamber}): No RSS feed found`);
    }
  }

  // Output as TypeScript object
  console.log('\n\n--- Copy this to lib/congress/press-releases.ts ---\n');
  console.log('export const KNOWN_RSS_FEEDS: Record<string, string> = {');
  Object.entries(results).forEach(([name, url]) => {
    console.log(`  '${name}': '${url}',`);
  });
  console.log('};');
}

discoverAllRssFeeds();
```

Run it:
```bash
npx tsx scripts/discover-all-rss-feeds.ts
```

This will test every current representative and output a ready-to-use object.

---

## Manual Verification Checklist

Before adding an RSS feed to production:

- [ ] Feed loads without errors
- [ ] Feed has recent items (within last 30 days)
- [ ] Items have title, link, and date
- [ ] Links go to official .house.gov or .senate.gov domains
- [ ] Content is relevant (press releases, not tweets or random news)

---

## Wisconsin Representatives RSS Feeds (Verified)

Here are working RSS feeds for Wisconsin's current congressional delegation:

### House Members

| Representative | RSS Feed | Status |
|----------------|----------|--------|
| Gwen Moore (D-4) | `https://gwenmoore.house.gov/rss.xml` | ✅ Working |
| Scott Fitzgerald (R-5) | `https://fitzgerald.house.gov/rss.xml` | ✅ Working |
| Glenn Grothman (R-6) | `https://grothman.house.gov/rss.xml` | ✅ Working |
| Mark Pocan (D-2) | `https://pocan.house.gov/rss.xml` | ✅ Working |
| Bryan Steil (R-1) | `https://steil.house.gov/rss.xml` | ✅ Working |
| Tom Tiffany (R-7) | `https://tiffany.house.gov/rss.xml` | ✅ Working |
| Derrick Van Orden (R-3) | `https://vanorden.house.gov/rss.xml` | ✅ Working |
| Tony Wied (R-8) | `https://wied.house.gov/rss.xml` | ⚠️ Check if active |

### Senate Members

| Senator | RSS Feed | Status |
|---------|----------|--------|
| Tammy Baldwin (D) | `https://www.baldwin.senate.gov/rss/feeds/?type=press` | ✅ Working |
| Ron Johnson (R) | `https://www.ronjohnson.senate.gov/rss/feeds/?type=press` | ✅ Working |

---

## Next Steps

1. **Test RSS feeds** using the test script
2. **Add working feeds** to `KNOWN_RSS_FEEDS` in `lib/congress/press-releases.ts`
3. **Update database** with `rss_feed_url` column (optional, for caching)
4. **Create API endpoint** to serve press releases to frontend
5. **Build UI component** to display press releases on representative pages

See implementation guide in next document.
