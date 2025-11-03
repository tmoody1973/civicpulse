# How to Restart Bill Syncing - Quick Reference

## 🚀 Three Ways to Sync Bills

### Option 1: Manual Trigger (GitHub Actions) ⭐ RECOMMENDED
**Triggers the full automated pipeline (fetch + AI + indexing)**

1. Go to: https://github.com/YOUR_USERNAME/hakivo/actions
2. Click "Daily Bill Sync" workflow on the left
3. Click "Run workflow" button (top right)
4. Select branch: `main` (or your branch)
5. Click green "Run workflow" button
6. Wait ~5-25 minutes
7. Check status at: http://localhost:3000/admin (or your live site)

**What it does:**
- Fetches 100 new/updated bills from Congress.gov
- Runs AI policy area inference
- Indexes in SmartBuckets (semantic search)
- Syncs to Algolia (keyword search)
- Saves sync status to database

---

### Option 2: Run Locally (Quick Metadata Fetch)
**Fetches bills to database, no AI processing**

```bash
# From project root
npm run fetch:bills -- --congress=119 --limit=100
```

**What it does:**
- Fetches metadata for 100 bills (titles, sponsors, status)
- Saves to database via RAINDROP_SERVICE_URL
- Takes ~5 minutes
- Does NOT run AI analysis or search indexing

**Then optionally run the pipeline:**
```bash
npx tsx scripts/post-fetch-pipeline.ts
```

---

### Option 3: Full Local Sync (Slow - Use for Testing)
**Fetches bills WITH summaries and full text**

```bash
npm run fetch:bills -- --congress=119 --limit=50 --full
```

**Warning:** Very slow! Fetches complete bill text from Congress.gov
- 50 bills = ~15-20 minutes
- 100 bills = ~30-40 minutes
- Use only when you need full bill text immediately

---

## 📊 Check Sync Status

### Option A: Admin Dashboard
- Local: http://localhost:3000/admin
- Live: https://hakivo.netlify.app/admin

Shows:
- Last sync time
- Success/failure status
- Bills fetched count
- Duration
- Error messages (if any)
- Link to GitHub logs

### Option B: GitHub Actions Logs
1. Go to: https://github.com/YOUR_USERNAME/hakivo/actions
2. Click latest "Daily Bill Sync" run
3. Click "Sync Bills from Congress.gov" job
4. Expand steps to see detailed logs

### Option C: Database Query
```bash
# Check last 10 syncs
npx tsx -e "
(async () => {
  const response = await fetch(process.env.RAINDROP_SERVICE_URL + '/api/admin/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'sync_history',
      query: 'SELECT * FROM sync_history ORDER BY started_at DESC LIMIT 10'
    })
  });
  const data = await response.json();
  console.table(data.rows);
})();
"
```

---

## 🔧 Environment Variables Required

Make sure these are set in `.env.local` (local) or GitHub Secrets (Actions):

```bash
# Required for all methods
CONGRESS_API_KEY=your_key_here
RAINDROP_SERVICE_URL=https://your-raindrop-service.com

# Required for full pipeline (Option 1 & 3)
ANTHROPIC_API_KEY=your_key_here
ALGOLIA_APP_ID=your_app_id
ALGOLIA_ADMIN_KEY=your_admin_key
```

**Check if secrets are set:**
```bash
# Local
cat .env.local | grep -E "CONGRESS_API_KEY|RAINDROP_SERVICE_URL"

# GitHub (web UI only)
# Go to: Settings → Secrets and variables → Actions
```

---

## ⏰ Automatic Schedule

The sync runs automatically:
- **Time:** 2 AM UTC daily (9 PM EST / 6 PM PST)
- **What:** Fetches ~100 new bills (metadata only)
- **Duration:** ~5-25 minutes
- **No action needed** - it just works!

---

## 🐛 Troubleshooting

### Sync fails with "API key invalid"
```bash
# Verify Congress.gov API key
curl "https://api.congress.gov/v3/bill/119?api_key=YOUR_KEY"

# If invalid, get new key at: https://api.congress.gov/sign-up/
```

### Sync succeeds but bills don't appear
1. Check database:
```bash
npx tsx -e "
(async () => {
  const response = await fetch(process.env.RAINDROP_SERVICE_URL + '/api/admin/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: 'SELECT COUNT(*) as count FROM bills WHERE congress = 119'
    })
  });
  const data = await response.json();
  console.log('Bills in database:', data.rows[0].count);
})();
"
```

2. Check API endpoint:
```bash
curl http://localhost:3000/api/bills?limit=10
```

### GitHub Action doesn't run
1. Check workflow file exists: `.github/workflows/daily-bill-sync.yml`
2. Verify GitHub Actions is enabled:
   - Go to: Settings → Actions → General
   - Set "Actions permissions" to "Allow all actions"
3. Check secrets are configured:
   - Go to: Settings → Secrets and variables → Actions
   - Verify CONGRESS_API_KEY, RAINDROP_SERVICE_URL, etc.

---

## 📚 Related Documentation

- Full setup guide: `docs/AUTOMATED-BILL-SYNC.md`
- Workflow file: `.github/workflows/daily-bill-sync.yml`
- Fetch script: `scripts/fetch-bills.ts`
- Pipeline script: `scripts/post-fetch-pipeline.ts`
- Admin dashboard setup: `docs/SETUP-ADMIN-SYNC-STATUS.md`

---

**Last Updated:** November 1, 2025
