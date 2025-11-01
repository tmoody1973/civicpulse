# Automated Bill Sync System - Plain English Explanation

## Overview

This system automatically keeps your database updated with the latest bills from Congress.gov without you having to manually run scripts.

---

## How It Works (The Complete Flow)

### 1. **The Daily Alarm Clock** (GitHub Actions)

**What it is:** A scheduled task that runs every day at 2 AM UTC (9 PM EST/6 PM PST)

**What it does:**
- Wakes up at 2 AM
- Fetches new bills from Congress.gov
- Processes them through AI analysis
- Syncs to search engines (SmartBuckets + Algolia)
- Records what happened (success or failure)
- Goes back to sleep until tomorrow

**Think of it like:** An overnight janitor that tidies up your data while you sleep.

---

### 2. **The Process (Step-by-Step)**

#### Step 1: Fetch Bills from Congress.gov
- Connects to Congress.gov API
- Asks: "What bills were introduced or updated today?"
- Downloads all the details (title, sponsor, status, etc.)
- Respects their speed limit (1 request per second)
- Saves to your Raindrop database

#### Step 2: AI Analysis
- Reads each new bill
- Uses Claude AI to categorize it (healthcare, defense, education, etc.)
- Adds tags to make searching easier later

#### Step 3: SmartBuckets Sync
- Indexes bills in SmartBuckets (Raindrop's semantic search)
- This lets users search by meaning, not just keywords
- Example: "bills about student loans" finds bills even if they say "education financing"

#### Step 4: Algolia Sync
- Indexes bills in Algolia (fast keyword search)
- This powers your lightning-fast search bar
- Example: typing "healthcare" instantly shows all healthcare bills

#### Step 5: Record What Happened
- Saves a log entry in the `sync_history` database table:
  - When it ran
  - Did it succeed or fail?
  - Link to the full logs on GitHub
  - How many bills were processed

---

### 3. **The Admin Dashboard** (Where You See Status)

**Location:** http://localhost:3000/admin (or your live site /admin)

**What you'll see:**

#### Sync Status Widget
```
┌─────────────────────────────────────────┐
│  Daily Bill Sync Status                 │
├─────────────────────────────────────────┤
│  Last Run: Today at 2:05 AM             │
│  Status: ✅ Success                      │
│  Bills Fetched: 127                     │
│  Bills Processed: 127                   │
│  Duration: 23 minutes                   │
│                                         │
│  [View Full Logs]  [Run Manually Now]  │
└─────────────────────────────────────────┘

Recent Sync History:
┌─────────────────┬──────────┬───────────┐
│ Date            │ Status   │ Bills     │
├─────────────────┼──────────┼───────────┤
│ Nov 1, 2:05 AM  │ ✅ Success│ 127 bills │
│ Oct 31, 2:04 AM │ ✅ Success│ 85 bills  │
│ Oct 30, 2:03 AM │ ❌ Failed │ 0 bills   │
│ Oct 29, 2:05 AM │ ✅ Success│ 143 bills │
└─────────────────┴──────────┴───────────┘
```

**If something goes wrong:**
- Status shows "❌ Failed"
- Error message displays
- "View Full Logs" button takes you to GitHub Actions logs
- You get an email notification (if configured)

---

## Setup Instructions (One-Time)

### Step 1: Set GitHub Secrets

Go to your GitHub repository settings and add these secrets:

```
Settings → Secrets and variables → Actions → New repository secret
```

Add these secrets:
- `CONGRESS_API_KEY` - Your Congress.gov API key
- `RAINDROP_SERVICE_URL` - Your Raindrop service URL
- `ANTHROPIC_API_KEY` - Your Claude AI key
- `ALGOLIA_APP_ID` - Your Algolia app ID
- `ALGOLIA_ADMIN_KEY` - Your Algolia admin key

**Why secrets?** So your API keys aren't exposed in public code.

### Step 2: Commit the Workflow File

The workflow file is already created at:
```
.github/workflows/daily-bill-sync.yml
```

Just commit it:
```bash
git add .github/workflows/daily-bill-sync.yml
git commit -m "Add automated daily bill sync"
git push
```

### Step 3: Enable GitHub Actions

1. Go to your GitHub repo
2. Click "Actions" tab
3. Enable workflows if prompted

### Step 4: Test It Manually (Optional)

Don't want to wait until 2 AM? Test it now:

1. Go to Actions tab on GitHub
2. Click "Daily Bill Sync"
3. Click "Run workflow" button
4. Click green "Run workflow" button again
5. Watch it run in real-time

---

## Viewing Sync Status in Admin Dashboard

### What Gets Tracked

Every sync run saves this info to the database:

| Field | What It Means |
|-------|---------------|
| `sync_type` | "daily_bill_sync" (vs manual sync) |
| `status` | "success" or "failure" |
| `started_at` | When the sync began |
| `completed_at` | When it finished |
| `run_id` | GitHub Actions run ID |
| `run_url` | Link to view full logs |
| `bills_fetched` | How many bills downloaded |
| `bills_processed` | How many made it through AI + search |
| `error_message` | What went wrong (if failed) |

### How to Access Sync Status

**Option 1: Via API Endpoint**
```bash
GET /api/admin/sync-status
```

Returns:
```json
{
  "latest": {
    "sync_type": "daily_bill_sync",
    "status": "success",
    "started_at": "2025-11-01T02:05:00Z",
    "completed_at": "2025-11-01T02:28:00Z",
    "bills_fetched": 127,
    "run_url": "https://github.com/yourrepo/actions/runs/123456"
  },
  "history": [
    // last 10 runs
  ]
}
```

**Option 2: In Admin Dashboard UI**

Component will be added at `/app/admin/page.tsx` showing:
- Current sync status
- Last successful run
- History of recent runs
- Quick actions (run manual sync, view logs)

---

## Troubleshooting

### "The sync failed at 2 AM"

1. Click "View Full Logs" in admin dashboard
2. Look for error messages
3. Common issues:
   - **API key expired:** Update GitHub secret
   - **Rate limit exceeded:** Congress.gov limits to 1 req/sec
   - **Service timeout:** GitHub Actions max is 6 hours
   - **Network error:** Retry automatically tomorrow

### "No bills were fetched"

This might be normal! Congress doesn't introduce new bills every single day. Check:
- Is Congress in session?
- Was yesterday a weekend or holiday?
- Look at the logs to see if API returned empty results

### "I want to run it more often"

Edit `.github/workflows/daily-bill-sync.yml`:

```yaml
# Current: Runs daily at 2 AM
schedule:
  - cron: '0 2 * * *'

# Change to: Run every 6 hours
schedule:
  - cron: '0 */6 * * *'

# Or: Run hourly (not recommended - you'll hit rate limits)
schedule:
  - cron: '0 * * * *'
```

**Warning:** Congress.gov has rate limits. Daily is recommended.

---

## Cost

**Completely free!** GitHub Actions gives you:
- 2,000 minutes/month (free tier)
- Your sync takes ~25 minutes
- = 80 syncs per month
- = ~2-3 syncs per day (more than enough)

If you exceed this:
- Upgrade to GitHub Pro ($4/month for unlimited)
- Or reduce sync frequency

---

## Notifications (Optional)

### Get Email When Sync Fails

Add this to the workflow:

```yaml
- name: Notify on failure
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.MAIL_USERNAME }}
    password: ${{ secrets.MAIL_PASSWORD }}
    subject: "❌ Bill Sync Failed"
    to: your-email@example.com
    from: Civic Pulse Alerts
    body: "The daily bill sync failed. Check logs: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

### Slack Notifications

Replace email step with:

```yaml
- name: Notify on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "❌ Daily bill sync failed. <https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}|View logs>"
      }
```

---

## What Happens to Your Data

### Where Bills Are Stored

1. **Raindrop Database** (Primary storage)
   - Raw bill data
   - Metadata (sponsor, status, dates)
   - AI-generated categorizations

2. **SmartBuckets** (Semantic search)
   - Indexed bill text
   - Vector embeddings for AI search
   - Enables "search by meaning"

3. **Algolia** (Fast keyword search)
   - Indexed bill titles and summaries
   - Powers instant search
   - Faceted filters (by status, date, etc.)

### Data Flow

```
Congress.gov API
      ↓
Raindrop Database (source of truth)
      ↓
   ┌──┴──┐
   ↓     ↓
SmartBuckets  Algolia
(semantic)    (keyword)
   ↓           ↓
Your users search both simultaneously
```

---

## Manual Override

**Need to fetch bills manually?**

Run this command locally:
```bash
npm run fetch:bills
npx tsx scripts/post-fetch-pipeline.ts
```

Or trigger via GitHub Actions:
1. Go to Actions tab
2. Click "Daily Bill Sync"
3. Click "Run workflow"

**When to do this:**
- Testing new features
- Congress just passed something important
- Sync failed overnight and you need data now

---

## Summary

**You now have:**
✅ Automated daily bill fetching (2 AM UTC)
✅ AI analysis and categorization
✅ Search engine syncing (SmartBuckets + Algolia)
✅ Admin dashboard showing sync status
✅ Complete history of all syncs
✅ Error tracking and notifications

**You no longer need to:**
❌ Manually run `npm run fetch:bills`
❌ Remember to sync data
❌ Worry about missing new bills

**The system runs on autopilot!**
