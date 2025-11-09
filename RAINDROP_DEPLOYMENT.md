# HakiVo Raindrop Deployment Guide

## 🎯 Overview

This guide covers deploying HakiVo's background job processing system using Raindrop Platform workers to solve the Netlify timeout issues.

**Problem Solved:**
- ❌ Netlify Functions timeout at 26 seconds (free tier)
- ❌ Brief audio generation takes 5-10 minutes (ElevenLabs API)
- ❌ Redis/BullMQ constant timeouts with Upstash free tier

**Solution:**
- ✅ Raindrop Observers have NO timeout (can run indefinitely)
- ✅ Built-in queue system (no external Redis needed)
- ✅ Automatic retries with exponential backoff
- ✅ 100% Raindrop Platform (hackathon compliant)

---

## 📦 What Was Built

### 1. Raindrop Worker Application (`raindrop-workers/`)

Complete worker application with:
- **Task** (`daily_brief_scheduler`) - Runs @daily at midnight UTC
- **Queues** (`brief_queue`, `news_queue`) - Durable message queues
- **Observers** (`brief_worker`, `news_worker`) - NO TIMEOUT job processors
- **Shared Libraries** - All API integrations (Claude, ElevenLabs, Brave, Pexels, Vultr)

### 2. Netlify Integration

Updated Netlify application to:
- Send jobs to Raindrop queues via HTTP API
- Poll database for job completion (instead of Redis queue)
- Pass complete user data to workers (interests, location, etc.)

---

## 🚀 Deployment Steps

### Step 1: Set Netlify Environment Variables

These are required for the Netlify app to communicate with Raindrop workers:

```bash
# In Netlify UI: Site Settings > Environment Variables

# Raindrop Platform
RAINDROP_API_KEY=your-raindrop-api-key-here
RAINDROP_API_URL=https://api.raindrop.ai/v1

# (All other existing variables remain the same)
```

**OR via Netlify CLI:**
```bash
netlify env:set RAINDROP_API_KEY "your-raindrop-api-key"
netlify env:set RAINDROP_API_URL "https://api.raindrop.ai/v1"
```

### Step 2: Deploy Updated Netlify App

```bash
# Build and deploy the updated Netlify app
npm run build
netlify deploy --prod
```

This deploys the updated queue integration that sends jobs to Raindrop workers.

### Step 3: Deploy Raindrop Workers

```bash
cd raindrop-workers

# Install dependencies
npm install

# Login to Raindrop (if not already logged in)
raindrop auth login

# Set environment secrets for Raindrop workers
raindrop secret set ANTHROPIC_API_KEY="your-claude-api-key"
raindrop secret set ELEVENLABS_API_KEY="your-elevenlabs-api-key"
raindrop secret set ELEVENLABS_SARAH_VOICE_ID="your-sarah-voice-id"
raindrop secret set ELEVENLABS_JAMES_VOICE_ID="your-james-voice-id"
raindrop secret set VULTR_STORAGE_ENDPOINT="your-vultr-endpoint"
raindrop secret set VULTR_ACCESS_KEY="your-vultr-access-key"
raindrop secret set VULTR_SECRET_KEY="your-vultr-secret-key"
raindrop secret set VULTR_CDN_URL="your-vultr-cdn-url"
raindrop secret set BRAVE_SEARCH_API_KEY="your-brave-api-key"
raindrop secret set PEXELS_API_KEY="your-pexels-api-key"

# Deploy to Raindrop Platform
raindrop build deploy
```

**This deploys:**
- ✅ Daily scheduler Task (runs at midnight UTC)
- ✅ Brief queue + Observer (5-10 min jobs, NO timeout)
- ✅ News queue + Observer (20-30s jobs, NO timeout)
- ✅ Connection to existing Raindrop SQL database

### Step 4: Verify Deployment

```bash
# Check deployment status
raindrop build status

# View recent logs
raindrop logs follow --filter="daily_brief_scheduler"
raindrop logs follow --filter="brief_worker"
raindrop logs follow --filter="news_worker"

# Check queue stats
raindrop queue stats brief_queue
raindrop queue stats news_queue

# Check observer status
raindrop observer status brief_worker
raindrop observer status news_worker
```

---

## 🧪 Testing

### Test Manual Brief Generation

1. **Via Netlify app:**
   ```bash
   # Make API request to generate brief
   curl -X POST https://hakivo.netlify.app/api/briefs/generate-daily \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"force_regenerate": true}'
   ```

2. **Via Raindrop queue directly:**
   ```bash
   raindrop queue send brief_queue '{
     "userId": "test-user-123",
     "userEmail": "test@example.com",
     "policyInterests": ["Politics", "Healthcare"],
     "forceRegenerate": false
   }'
   ```

3. **Watch the worker process it:**
   ```bash
   raindrop logs follow --filter="brief_worker"
   ```

   You should see:
   - ✅ Job received
   - ✅ News articles fetched
   - ✅ Bills queried
   - ✅ Script generated with Claude
   - ✅ Audio generated with ElevenLabs (5-10 min)
   - ✅ Audio uploaded to Vultr
   - ✅ Brief saved to database

### Test Manual News Generation

1. **Via Netlify app:**
   ```bash
   curl -X POST https://hakivo.netlify.app/api/news/queue \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "interests": ["Politics", "Healthcare"],
       "limit": 10,
       "forceRefresh": true
     }'
   ```

2. **Via Raindrop queue directly:**
   ```bash
   raindrop queue send news_queue '{
     "userId": "test-user-123",
     "userEmail": "test@example.com",
     "interests": ["Politics", "Healthcare"],
     "limit": 10,
     "forceRefresh": true
   }'
   ```

3. **Watch the worker:**
   ```bash
   raindrop logs follow --filter="news_worker"
   ```

### Test Automated Daily Scheduler

The scheduler runs automatically at midnight UTC (7pm EST / 4pm PST).

To test it manually before midnight:
```bash
raindrop task trigger daily_brief_scheduler
```

This will:
1. Query all users from database
2. Queue brief generation job for each user
3. Observers will process jobs one by one

---

## 📊 Monitoring

### Queue Metrics
```bash
# Check how many jobs are waiting
raindrop queue stats brief_queue

# Check observer health
raindrop observer status brief_worker

# View error rates
raindrop logs --level=error --filter="brief_worker"
```

### Database Checks
```bash
# Check if briefs are being generated
SELECT COUNT(*) FROM briefs WHERE DATE(generated_at) = DATE('now');

# Check if news is being cached
SELECT COUNT(*) FROM personalized_news_cache WHERE DATE(fetched_at) = DATE('now');
```

---

## 🔧 Troubleshooting

### Workers Not Processing Jobs

**Check if observers are running:**
```bash
raindrop observer status brief_worker
raindrop observer status news_worker
```

**Check queue depth:**
```bash
raindrop queue stats brief_queue
```

If queue has jobs but workers aren't processing:
- Check worker logs: `raindrop logs follow --filter="brief_worker"`
- Verify secrets are set: `raindrop secret list`
- Redeploy workers: `raindrop build deploy`

### Netlify App Can't Queue Jobs

**Error: "RAINDROP_API_KEY not set"**
- Set environment variable in Netlify UI or CLI
- Redeploy Netlify app after setting

**Error: "Raindrop queue API error: 404"**
- Raindrop workers not deployed yet
- Deploy with: `cd raindrop-workers && raindrop build deploy`

**Error: "Raindrop queue API error: 401 Unauthorized"**
- Invalid RAINDROP_API_KEY
- Get new key from Raindrop dashboard
- Update in Netlify environment variables

### Audio Generation Fails

**Check ElevenLabs API key:**
```bash
raindrop secret get ELEVENLABS_API_KEY
```

**Check worker logs for errors:**
```bash
raindrop logs follow --filter="brief_worker" --level=error
```

**Common issues:**
- ElevenLabs API rate limit (wait and retry)
- Invalid voice IDs (verify in ElevenLabs dashboard)
- Audio generation timeout (should NOT happen with Observers)

---

## ✅ Success Criteria

### Daily Automation
At midnight UTC every day:
1. ✅ Scheduler task triggers
2. ✅ Jobs queued for all users (one per user)
3. ✅ Brief worker processes jobs (5-10 min each, NO timeout)
4. ✅ Complete briefs with audio saved to database
5. ✅ Users see new briefs on dashboard next morning

### On-Demand Requests
When user requests news:
1. ✅ Netlify API queues job to Raindrop (returns immediately)
2. ✅ Response in < 1 second with job ID
3. ✅ News worker processes in background (20-30s, NO timeout)
4. ✅ Articles saved to database + cached
5. ✅ Frontend polls and displays when ready

### No More Timeouts
- ✅ Brief generation works (was timing out at 26s on Netlify)
- ✅ News generation works (was timing out occasionally)
- ✅ No Redis connection errors (built-in Raindrop Queue)
- ✅ 100% Raindrop Platform (hackathon compliant)

---

## 📚 Additional Resources

- [Raindrop Queue Documentation](https://docs.raindrop.ai/reference/queue)
- [Raindrop Task Documentation](https://docs.raindrop.ai/reference/task)
- [Raindrop Observer Documentation](https://docs.raindrop.ai/reference/observers)
- [Background Job Processing Pattern](https://docs.raindrop.ai/reference/architecture-patterns/background-job-processing)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)

---

## 🎉 Summary

**What you've deployed:**
1. ✅ Raindrop worker application (`raindrop-workers/`)
2. ✅ Updated Netlify app with Raindrop integration
3. ✅ Automated daily brief generation (midnight UTC)
4. ✅ Background news generation (NO timeouts)

**Next steps:**
1. Wait for midnight UTC to see automated briefs
2. Monitor logs: `raindrop logs follow`
3. Check database for new briefs tomorrow morning
4. Celebrate solving the timeout problem! 🎉

**Everything now runs on Raindrop Platform with NO timeout constraints!**
