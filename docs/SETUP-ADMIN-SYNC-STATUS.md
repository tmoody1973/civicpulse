# How to Add Sync Status to Admin Dashboard

## Plain English Explanation

You now have everything set up to automatically sync bills daily AND display the status in your admin dashboard. Here's how it all works:

---

## What We Just Created

### 1. **The Automated Sync** (GitHub Actions Workflow)
**File:** `.github/workflows/daily-bill-sync.yml`

**What it does:**
- Runs every day at 2 AM UTC
- Fetches new bills from Congress.gov
- Processes them with AI
- Syncs to search engines
- Saves a record of what happened

Think of it as a robot that works while you sleep.

### 2. **The Database Table** (sync_history)
**File:** `src/web/index.ts` (lines 188-207)

**What it stores:**
- When each sync ran
- Did it succeed or fail?
- How many bills were processed
- Link to view detailed logs
- Any error messages

Think of it as the robot's daily report card.

### 3. **The API Endpoint** (fetch sync status)
**File:** `app/api/admin/sync-status/route.ts`

**What it does:**
- Your admin page asks: "How did the sync go?"
- This endpoint checks the database
- Returns the latest status + history

Think of it as the messenger that brings the report card to you.

### 4. **The Dashboard Widget** (shows sync status)
**File:** `components/admin/sync-status-widget.tsx`

**What it shows:**
- ✅ Last sync: When it ran, success/failure
- 📊 Stats: How many bills, success rate
- 📜 History: Last 10 syncs
- 🔗 Buttons: View logs, run manually

Think of it as the report card reader that makes it pretty.

---

## How to Add It to Your Admin Page

### Option 1: Quick Add (If you have an admin page)

1. Open your admin page file (probably `/app/admin/page.tsx`)

2. Import the component:
```typescript
import { SyncStatusWidget } from '@/components/admin/sync-status-widget';
```

3. Add it to your page:
```typescript
export default function AdminPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Add the sync status widget */}
      <SyncStatusWidget />

      {/* Your other admin components */}
    </div>
  );
}
```

### Option 2: Create Admin Page from Scratch

If you don't have an admin page yet, create one:

**File:** `app/admin/page.tsx`

```typescript
import { SyncStatusWidget } from '@/components/admin/sync-status-widget';

export default function AdminPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor automated bill syncs and system status
        </p>
      </div>

      <SyncStatusWidget />

      {/* Future: Add more admin widgets here */}
    </div>
  );
}
```

---

## What You'll See

### When First Loaded (No Syncs Yet)

```
┌─────────────────────────────────────────┐
│  Daily Bill Sync Status           [Refresh] │
├─────────────────────────────────────────┤
│  No sync history found.                 │
│  The automated sync will run at 2 AM UTC.│
└─────────────────────────────────────────┘
```

### After First Successful Sync

```
┌─────────────────────────────────────────┐
│  Daily Bill Sync Status           [Refresh] │
├─────────────────────────────────────────┤
│  Last Run    Status    Bills     Success │
│  Nov 1,      ✅ Success 127 bills   100%  │
│  2:05 AM                                 │
│  23 min                                  │
│                                         │
│  [View Full Logs]  [Run Manually Now]  │
└─────────────────────────────────────────┘

Recent Sync History
┌─────────────────┬──────────┬───────────┐
│ Nov 1, 2:05 AM  │ ✅ Success│ 127 bills │
└─────────────────┴──────────┴───────────┘
```

### If a Sync Fails

```
┌─────────────────────────────────────────┐
│  Daily Bill Sync Status           [Refresh] │
├─────────────────────────────────────────┤
│  Last Run    Status      Bills   Success │
│  Nov 1,      ❌ Failed    0 bills   90%   │
│  2:05 AM                                 │
│  2 min                                   │
│                                         │
│  ⚠️  Error                               │
│  API rate limit exceeded. Retry         │
│  scheduled for tomorrow.                │
│                                         │
│  [View Full Logs]  [Run Manually Now]  │
└─────────────────────────────────────────┘
```

---

## Setting Up GitHub Secrets (One-Time)

For the automated sync to work, you need to add API keys to GitHub:

### Step-by-Step:

1. **Go to your GitHub repository**
   - Visit: https://github.com/YOUR_USERNAME/civicpulse

2. **Navigate to Settings**
   - Click "Settings" tab
   - Click "Secrets and variables" → "Actions"

3. **Add these secrets** (click "New repository secret" for each):

   | Secret Name | Where to Get It | What It's For |
   |-------------|----------------|---------------|
   | `CONGRESS_API_KEY` | https://api.congress.gov/sign-up | Fetching bills from Congress.gov |
   | `RAINDROP_SERVICE_URL` | Your Raindrop dashboard | Saving bills to database |
   | `ANTHROPIC_API_KEY` | https://console.anthropic.com | AI bill categorization |
   | `ALGOLIA_APP_ID` | Your Algolia dashboard | Fast search indexing |
   | `ALGOLIA_ADMIN_KEY` | Your Algolia dashboard | Search admin access |

4. **Done!** The workflow will use these automatically.

---

## Testing the System

### Test the API Endpoint

```bash
# Make sure dev server is running
npm run dev

# In another terminal:
curl http://localhost:3000/api/admin/sync-status
```

Expected response:
```json
{
  "latest": null,
  "history": [],
  "stats": {
    "totalRuns": 0,
    "successfulRuns": 0,
    "failedRuns": 0,
    "successRate": 0
  }
}
```

(Empty because no syncs have run yet)

### Test the Dashboard Widget

1. Visit http://localhost:3000/admin
2. You should see "No sync history found"
3. This is correct - the first sync hasn't run yet

### Trigger First Manual Sync

1. Go to https://github.com/YOUR_USERNAME/civicpulse/actions
2. Click "Daily Bill Sync" workflow
3. Click "Run workflow" dropdown
4. Click green "Run workflow" button
5. Wait ~25 minutes
6. Refresh your admin page - you'll see the results!

---

## How the Data Flows

### Every Day at 2 AM:

```
1. GitHub Actions wakes up
         ↓
2. Fetches bills from Congress.gov
         ↓
3. Saves to Raindrop database
         ↓
4. AI categorizes bills (policy areas)
         ↓
5. Syncs to SmartBuckets (semantic search)
         ↓
6. Syncs to Algolia (keyword search)
         ↓
7. Saves sync status to sync_history table
         ↓
8. Goes back to sleep
```

### When You Visit /admin:

```
1. Admin page loads
         ↓
2. SyncStatusWidget component mounts
         ↓
3. Calls /api/admin/sync-status
         ↓
4. API queries sync_history table
         ↓
5. Returns latest sync + history
         ↓
6. Widget displays the data
         ↓
7. Auto-refreshes every 5 minutes
```

---

## Customization Options

### Change Sync Schedule

Edit `.github/workflows/daily-bill-sync.yml`:

```yaml
# Current: Daily at 2 AM
schedule:
  - cron: '0 2 * * *'

# Every 12 hours:
schedule:
  - cron: '0 */12 * * *'

# Every Monday at 6 AM:
schedule:
  - cron: '0 6 * * 1'
```

[Cron schedule reference](https://crontab.guru/)

### Change Displayed History

Edit `components/admin/sync-status-widget.tsx`:

```typescript
// Current: Shows last 10 syncs
query: `SELECT * FROM sync_history ... LIMIT 10`

// Show last 20:
query: `SELECT * FROM sync_history ... LIMIT 20`
```

### Add Email Notifications

See `docs/AUTOMATED-BILL-SYNC.md` section on "Notifications"

---

## Troubleshooting

### "Widget shows 'Loading...' forever"

**Problem:** API endpoint not responding

**Fix:**
```bash
# Check if dev server is running
npm run dev

# Check API endpoint directly
curl http://localhost:3000/api/admin/sync-status

# Check server logs for errors
```

### "404 on /api/admin/sync-status"

**Problem:** API route file not found

**Check:**
- File exists at `app/api/admin/sync-status/route.ts`
- Restart dev server: `npm run dev`

### "Table sync_history doesn't exist"

**Problem:** Database table not created

**Fix:**
```bash
# Deploy the Raindrop service
# The table will be created on first request
# Or check that src/web/index.ts has been deployed
```

### "GitHub Actions workflow not showing up"

**Problem:** Workflow file not committed

**Fix:**
```bash
git add .github/workflows/daily-bill-sync.yml
git commit -m "Add automated bill sync workflow"
git push
```

Then:
1. Go to GitHub Actions tab
2. You should see "Daily Bill Sync" workflow
3. Enable it if prompted

---

## Summary

**What you have now:**

✅ **Automated sync** runs daily at 2 AM
✅ **Database table** tracks all sync runs
✅ **API endpoint** serves sync status
✅ **Dashboard widget** displays everything beautifully
✅ **Manual trigger** for on-demand syncs

**What happens automatically:**

1. Every day at 2 AM: Fetch bills → Process → Sync → Record
2. Every 5 minutes: Admin dashboard auto-refreshes
3. On failure: Error logged, viewable in dashboard

**You're all set!** The system runs on autopilot. 🚀
