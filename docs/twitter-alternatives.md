# Alternatives to Twitter API for Representative Tweets

## The Problem

Twitter/X API pricing (as of 2025):
- **Free tier:** REMOVED (was 1,500 tweets/month)
- **Basic tier:** $100/month (10,000 tweets/month, read-only)
- **Pro tier:** $5,000/month (1M tweets/month)

For a civic engagement platform, this is too expensive, especially for a feature that's "nice to have" but not core.

---

## Alternative Solutions

### ✅ Solution 1: RSS Feeds via Nitter (FREE)

**What is Nitter?**
- Open-source alternative Twitter frontend
- Provides RSS feeds for any public Twitter account
- No authentication required
- Fast and lightweight

**Implementation:**

```typescript
// lib/twitter/nitter-rss.ts

interface Tweet {
  id: string;
  text: string;
  author: string;
  publishedAt: string;
  url: string;
}

export async function fetchTweetsViaRSS(twitterHandle: string): Promise<Tweet[]> {
  // Use a public Nitter instance
  const nitterInstance = 'nitter.net'; // or nitter.poast.org, nitter.privacydev.net
  const rssUrl = `https://${nitterInstance}/${twitterHandle}/rss`;

  try {
    const response = await fetch(rssUrl);
    const xml = await response.text();

    // Parse RSS XML (use a library like 'rss-parser')
    const Parser = require('rss-parser');
    const parser = new Parser();
    const feed = await parser.parseString(xml);

    return feed.items.slice(0, 10).map((item: any) => ({
      id: item.guid || item.link,
      text: item.contentSnippet || item.content,
      author: twitterHandle,
      publishedAt: item.pubDate,
      url: item.link
    }));
  } catch (error) {
    console.error(`Failed to fetch tweets for ${twitterHandle}:`, error);
    return [];
  }
}
```

**Pros:**
- ✅ Completely free
- ✅ No API keys needed
- ✅ Works for any public account
- ✅ Simple to implement

**Cons:**
- ❌ Nitter instances can be rate-limited or go down
- ❌ Less reliable than official API
- ❌ Limited to recent tweets (usually last 10-20)
- ❌ No real-time updates

**Recommended Approach:**
- Use multiple Nitter instances as fallbacks
- Cache tweets in your database
- Refresh every 6-12 hours (not real-time)

---

### ✅ Solution 2: Congressional Press Releases (FREE, OFFICIAL)

**Better Alternative:** Most representatives issue press releases that cover the same ground as tweets.

**Sources:**
1. **Congress.gov API** (FREE)
   - Many reps post statements directly
   - Official, verified content

2. **Representative websites**
   - Most have "News" or "Press Releases" sections
   - Can be scraped or have RSS feeds

3. **House.gov / Senate.gov**
   - Official newsrooms
   - Press release archives

**Implementation:**

```typescript
// lib/congress/press-releases.ts

export async function fetchPressReleases(bioguideId: string): Promise<any[]> {
  // Example: Fetch from representative's official website
  const rep = await fetchRepresentativeDetails(bioguideId);

  if (!rep.websiteUrl) return [];

  // Many congressional sites have RSS feeds
  const rssUrl = `${rep.websiteUrl}/rss/press-releases.xml`;

  try {
    const response = await fetch(rssUrl);
    const xml = await response.text();

    const Parser = require('rss-parser');
    const parser = new Parser();
    const feed = await parser.parseString(xml);

    return feed.items.slice(0, 5).map((item: any) => ({
      title: item.title,
      excerpt: item.contentSnippet?.substring(0, 200) + '...',
      url: item.link,
      publishedAt: item.pubDate
    }));
  } catch (error) {
    console.warn(`No press releases found for ${bioguideId}`);
    return [];
  }
}
```

**Pros:**
- ✅ Official, verified content
- ✅ More substantive than tweets
- ✅ Free and reliable
- ✅ Better for serious policy information

**Cons:**
- ❌ Not as frequent as tweets
- ❌ Less "social media" feel
- ❌ Each rep's website is different (harder to scrape)

---

### ✅ Solution 3: Third-Party Aggregators

**Option A: ProPublica Congress API** (FREE)
- https://projects.propublica.org/api-docs/congress-api/
- Provides some social media data for members
- Free API key (request at: https://www.propublica.org/datastore/api/propublica-congress-api)

**Option B: GovTrack.us** (FREE)
- Aggregates congressional activity
- Has some social media links
- No API costs

**Option C: Legiscan** ($$$)
- Professional legislative tracking
- Includes social media monitoring
- Expensive ($500-$2000/month)

---

### ✅ Solution 4: Embed Official Twitter Widget (FREE)

**Twitter still allows embedding** tweets via their widget:

```html
<!-- app/components/representative/twitter-timeline.tsx -->
<a
  className="twitter-timeline"
  data-height="400"
  data-theme="light"
  href="https://twitter.com/{handle}?ref_src=twsrc%5Etfw"
>
  Tweets by {handle}
</a>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
```

**Pros:**
- ✅ Free
- ✅ Official Twitter embed
- ✅ Real-time updates
- ✅ No API needed

**Cons:**
- ❌ Can't customize styling much
- ❌ Slower loading (external iframe)
- ❌ Twitter branding/tracking
- ❌ No control over data

---

### ✅ Solution 5: Periodic Web Scraping + Database Cache

**Hybrid Approach:** Scrape tweets periodically and cache in your database.

```typescript
// scripts/scrape-rep-tweets.ts

import * as cheerio from 'cheerio';

async function scrapeTweets(twitterHandle: string): Promise<Tweet[]> {
  // Use Nitter to scrape (respects robots.txt)
  const url = `https://nitter.net/${twitterHandle}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'HakiVo/1.0 (Civic Education Platform)'
    }
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  const tweets: Tweet[] = [];

  $('.timeline-item').each((i, elem) => {
    if (i >= 10) return; // Limit to 10 tweets

    const text = $(elem).find('.tweet-content').text().trim();
    const timestamp = $(elem).find('.tweet-date').attr('title');
    const link = $(elem).find('.tweet-link').attr('href');

    tweets.push({
      id: link?.split('/').pop() || '',
      text,
      publishedAt: timestamp || '',
      url: `https://twitter.com${link}`
    });
  });

  return tweets;
}

// Run this as a cron job every 6 hours
async function updateAllRepTweets() {
  const reps = await getAllRepresentatives();

  for (const rep of reps) {
    if (!rep.twitterHandle) continue;

    const tweets = await scrapeTweets(rep.twitterHandle);

    // Store in database
    await db.execute(`
      INSERT INTO representative_tweets (
        bioguide_id, tweet_id, text, published_at, url, fetched_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (tweet_id) DO NOTHING
    `, [
      rep.bioguideId,
      tweets[0].id,
      tweets[0].text,
      tweets[0].publishedAt,
      tweets[0].url,
      new Date().toISOString()
    ]);
  }
}
```

**Run as a background job:**

```json
// package.json
{
  "scripts": {
    "scrape:tweets": "tsx scripts/scrape-rep-tweets.ts"
  }
}
```

**Schedule with cron (on server):**
```bash
# Update tweets every 6 hours
0 */6 * * * cd /app && npm run scrape:tweets
```

**Pros:**
- ✅ Free
- ✅ Full control over data
- ✅ Fast (cached in your DB)
- ✅ Works even if Twitter/Nitter is down

**Cons:**
- ❌ Against Twitter's ToS (use Nitter to be respectful)
- ❌ Requires maintenance
- ❌ Not real-time (6-hour lag)

---

## Recommended Solution for HakiVo

### **Hybrid Approach: Press Releases + Nitter RSS**

1. **Primary:** Congressional press releases (official, free, substantive)
2. **Secondary:** Nitter RSS for tweets (free, simple)
3. **Fallback:** Twitter embed widget (if above fail)

### Implementation Plan:

```typescript
// lib/social/representative-activity.ts

interface RepresentativeActivity {
  type: 'press_release' | 'tweet';
  title?: string;
  text: string;
  url: string;
  publishedAt: string;
}

export async function getRepresentativeActivity(
  bioguideId: string
): Promise<RepresentativeActivity[]> {
  const activities: RepresentativeActivity[] = [];

  // 1. Fetch press releases (primary)
  try {
    const pressReleases = await fetchPressReleases(bioguideId);
    activities.push(...pressReleases.map(pr => ({
      type: 'press_release' as const,
      title: pr.title,
      text: pr.excerpt,
      url: pr.url,
      publishedAt: pr.publishedAt
    })));
  } catch (error) {
    console.warn('Failed to fetch press releases:', error);
  }

  // 2. Fetch tweets via Nitter RSS (secondary)
  const rep = await getRepresentative(bioguideId);
  if (rep.twitterHandle) {
    try {
      const tweets = await fetchTweetsViaRSS(rep.twitterHandle);
      activities.push(...tweets.map(tweet => ({
        type: 'tweet' as const,
        text: tweet.text,
        url: tweet.url,
        publishedAt: tweet.publishedAt
      })));
    } catch (error) {
      console.warn('Failed to fetch tweets:', error);
    }
  }

  // Sort by date (most recent first)
  return activities
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 10); // Show top 10
}
```

### UI Component:

```tsx
// components/representative/activity-feed.tsx

export function RepresentativeActivityFeed({ bioguideId }: { bioguideId: string }) {
  const [activities, setActivities] = useState<RepresentativeActivity[]>([]);

  useEffect(() => {
    fetch(`/api/representatives/${bioguideId}/activity`)
      .then(res => res.json())
      .then(data => setActivities(data));
  }, [bioguideId]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Recent Activity</h3>
      {activities.map((activity, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            {activity.type === 'press_release' && (
              <Badge variant="secondary" className="mb-2">Press Release</Badge>
            )}
            {activity.type === 'tweet' && (
              <Badge variant="outline" className="mb-2">🐦 Tweet</Badge>
            )}

            {activity.title && (
              <h4 className="font-semibold mb-2">{activity.title}</h4>
            )}

            <p className="text-sm text-muted-foreground mb-2">
              {activity.text}
            </p>

            <div className="flex items-center justify-between text-xs">
              <span>{formatDistanceToNow(new Date(activity.publishedAt))} ago</span>
              <a
                href={activity.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Read more →
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## Cost Comparison

| Solution | Monthly Cost | Reliability | Real-time | Effort |
|----------|-------------|-------------|-----------|---------|
| Twitter API Basic | $100 | ⭐⭐⭐⭐⭐ | ✅ Yes | ⭐ Easy |
| Nitter RSS | FREE | ⭐⭐⭐ | ❌ 6hr lag | ⭐⭐ Medium |
| Press Releases | FREE | ⭐⭐⭐⭐⭐ | ❌ Daily | ⭐⭐⭐ Hard |
| Twitter Embed | FREE | ⭐⭐⭐⭐ | ✅ Yes | ⭐ Easy |
| Web Scraping | FREE | ⭐⭐ | ❌ 6hr lag | ⭐⭐⭐⭐ Hard |

---

## Recommendation

For **HakiVo MVP:**

1. **Start with:** Press releases + Twitter embed widget
   - Press releases in main feed
   - Twitter widget in sidebar/modal
   - Zero cost, zero maintenance

2. **Phase 2:** Add Nitter RSS
   - Cache tweets in database
   - Update every 6 hours via cron job
   - Better UX than embed widget

3. **Phase 3 (if revenue allows):** Twitter API Basic tier
   - If platform has 1000+ paying users
   - $100/month becomes justified
   - Better reliability and real-time updates

**Bottom line:** Don't pay $100-$5000/month for tweets when free alternatives exist for an MVP. Save that money for critical features like Claude API usage and hosting.
