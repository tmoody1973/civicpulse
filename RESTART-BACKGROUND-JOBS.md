# Restart Background Jobs

## Quick Start (Everything at Once)

```bash
# Start dev server
npm run dev &

# Start SmartBuckets indexing (this is the important one)
npx tsx scripts/index-smartbuckets-119.ts 2>&1 | tee /tmp/smartbucket-index.log &

# Start policy area inference
npx tsx scripts/infer-policy-areas.ts 2>&1 | tee /tmp/policy-inference.log &
```

---

## Individual Jobs

### 1. Dev Server (Required)
```bash
npm run dev
```
This runs in foreground. Keep this terminal open.

### 2. SmartBuckets Indexing (For AI Search)
**This is the most important background job for semantic search!**

```bash
npx tsx scripts/index-smartbuckets-119.ts 2>&1 | tee /tmp/smartbucket-index.log &
```

**Check progress:**
```bash
tail -f /tmp/smartbucket-index.log
```

**Monitor status:**
```bash
npx tsx scripts/monitor-fetch-progress.ts
```

### 3. Policy Area Inference (Optional - Improves Filtering)
```bash
npx tsx scripts/infer-policy-areas.ts 2>&1 | tee /tmp/policy-inference.log &
```

**Check progress:**
```bash
tail -f /tmp/policy-inference.log
```

### 4. Congress Data Fetch (Only if you need fresh data)
```bash
npx tsx scripts/fetch-congress-119.ts &
```

### 5. Algolia Sync (Only if you changed data)
```bash
npx tsx scripts/sync-algolia-simple.ts &
```

---

## Check What's Running

```bash
# See all Node processes
ps aux | grep tsx

# See specific background jobs
ps aux | grep "index-smartbuckets"
ps aux | grep "infer-policy-areas"
```

---

## Stop All Background Jobs

```bash
# Kill all tsx processes
pkill -f tsx

# Or kill specific ones
pkill -f "index-smartbuckets"
pkill -f "infer-policy-areas"
```

---

## Recommended Startup Sequence

After shutting down and restarting:

1. **Start dev server** (in main terminal):
   ```bash
   npm run dev
   ```

2. **Open new terminal, start SmartBuckets indexing** (for AI search):
   ```bash
   cd /Users/tarikmoody/Documents/Projects/civicpulse
   npx tsx scripts/index-smartbuckets-119.ts 2>&1 | tee /tmp/smartbucket-index.log
   ```

3. **Optional: Open third terminal, start policy inference**:
   ```bash
   cd /Users/tarikmoody/Documents/Projects/civicpulse
   npx tsx scripts/infer-policy-areas.ts 2>&1 | tee /tmp/policy-inference.log
   ```

---

## Check If AI Search Is Working

**Test semantic search:**
```bash
curl -s "http://localhost:3000/api/search?q=What+bills+help+small+businesses?" | jq '.results | length'
```

If you get 0 or errors, SmartBuckets indexing might not be complete yet.

**Check indexing progress:**
```bash
tail -f /tmp/smartbucket-index.log
```

---

## Time Estimates

- **Dev server**: Instant
- **SmartBuckets indexing**: 2-4 hours (for all 9,172 bills)
- **Policy inference**: 1-2 hours (for bills without policy areas)
- **Congress fetch**: 4-6 hours (only needed if database is empty)

---

## Notes

- SmartBuckets indexing is the **critical job** for semantic AI search to work
- The dev server must be running for the app to work
- Policy inference is optional but improves filter quality
- You can run these jobs overnight and check progress in the morning

---

## Quick Health Check

```bash
# Check dev server
curl http://localhost:3000/api/search?q=test

# Check SmartBuckets progress
tail /tmp/smartbucket-index.log

# Check policy inference progress
tail /tmp/policy-inference.log
```

---

**Pro Tip**: Keep `/tmp/smartbucket-index.log` open in a terminal with `tail -f` so you can see progress!
