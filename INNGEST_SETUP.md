# Inngest Background Jobs Setup

This guide covers setting up Inngest for background job processing (daily brief generation with ElevenLabs + Claude).

## Why Inngest?

Inngest solves the long-running job problem that Raindrop and BullMQ couldn't handle:

- ✅ **No timeout limits** - Perfect for 10-15 minute brief generation jobs
- ✅ **Free tier** - 25,000 steps/month (plenty for our use case)
- ✅ **Built-in retries** - Automatic retry on API failures
- ✅ **Monitoring dashboard** - Track all jobs in real-time
- ✅ **5 minute setup** - Minimal configuration required
- ✅ **Native Netlify integration** - Works seamlessly with Netlify Functions

## Architecture

### Brief Generation Pipeline (5 Steps)

```
1. Fetch Bills (Turso DB query)
2. Fetch News (Brave Search API)
3. Generate Script (Claude API - 2-3 min)
4. Generate Audio (ElevenLabs text-to-dialogue - 10+ min)
5. Upload & Save (Vultr CDN + Turso DB)
```

Each step retries independently on failure, so we never lose progress.

### Daily Scheduler

- Cron: `0 6 * * *` (6:00 AM UTC daily)
- Fetches all users with interests from database
- Triggers brief generation for each user (fan-out pattern)

## Files Created

```
src/inngest/
  ├── client.ts                       # Inngest client
  └── functions/
      ├── generate-brief.ts           # Main brief generation function
      └── daily-brief-cron.ts         # Daily scheduler

netlify/functions/
  ├── inngest.ts                      # Inngest serve endpoint
  └── trigger-brief.ts                # Manual trigger endpoint
```

## Local Development

### 1. Install Inngest CLI

```bash
# macOS
brew install inngest/brew/inngest

# Or use npx
npx inngest-cli@latest
```

### 2. Start Inngest Dev Server

```bash
npx inngest-cli@latest dev
```

This starts the Inngest Dev Server at `http://localhost:8288`.

### 3. Start Netlify Dev

```bash
netlify dev
```

This starts your app at `http://localhost:8888` with Netlify Functions.

### 4. Test Brief Generation

```bash
# Trigger a brief for a specific user
curl -X POST http://localhost:8888/.netlify/functions/trigger-brief \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_01K8NC5EJ3JBZKC9EQRQBQQVK4",
    "policyInterests": ["healthcare", "education"]
  }'
```

### 5. Monitor Jobs

Open http://localhost:8288 to see:
- Running jobs
- Step-by-step execution
- Logs and errors
- Retry attempts

## Production Deployment

### 1. Sign Up for Inngest Cloud

Go to https://app.inngest.com/sign-up and create a free account.

### 2. Create a New App

- Click "Create App"
- Name: `hakivo-civic-pulse`
- Environment: `production`

### 3. Get Your Keys

Copy the keys from the Inngest dashboard:
- `INNGEST_EVENT_KEY` - For sending events
- `INNGEST_SIGNING_KEY` - For verifying requests

### 4. Set Environment Variables on Netlify

```bash
# Set Inngest keys
netlify env:set INNGEST_EVENT_KEY "your-event-key-here"
netlify env:set INNGEST_SIGNING_KEY "signkey-prod-xxxxx"

# Verify all environment variables are set
netlify env:list
```

### 5. Deploy to Netlify

```bash
# Deploy preview
netlify deploy

# Test in preview environment
curl -X POST https://YOUR-PREVIEW-URL/.netlify/functions/trigger-brief \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "policyInterests": ["healthcare"]}'

# Deploy to production
netlify deploy --prod
```

### 6. Sync Functions with Inngest

After deploying, go to Inngest dashboard:
1. Click "Sync app"
2. Enter your app URL: `https://hakivo.netlify.app/.netlify/functions/inngest`
3. Click "Sync"

Inngest will discover your functions and start executing them.

## Testing the Daily Cron

The cron runs at 6:00 AM UTC daily. To test manually:

```bash
# Using Inngest CLI (local)
npx inngest-cli@latest run daily-brief-cron

# Or trigger via API (production)
curl -X POST https://api.inngest.com/v1/events \
  -H "Authorization: Bearer $INNGEST_EVENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "inngest/function.cron", "data": {}}'
```

## Monitoring & Debugging

### Inngest Dashboard

View all jobs at https://app.inngest.com/:
- Function runs (success/failure)
- Step-by-step execution timeline
- Logs from each step
- Retry attempts
- Error traces

### Common Issues

**Issue: Functions not appearing in Inngest dashboard**
- Solution: Click "Sync app" in Inngest dashboard
- Verify serve endpoint is accessible: `https://your-app/.netlify/functions/inngest`

**Issue: ElevenLabs API timeout**
- Solution: Inngest automatically retries failed steps
- Check step logs in Inngest dashboard
- Verify `ELEVENLABS_API_KEY` is set

**Issue: Database connection failed**
- Solution: Verify Turso credentials:
  ```bash
  netlify env:get TURSO_DATABASE_URL
  netlify env:get TURSO_AUTH_TOKEN
  ```

**Issue: Cron not triggering**
- Solution: Check cron expression in `daily-brief-cron.ts`
- Verify cron is synced in Inngest dashboard
- Test manually: `npx inngest-cli run daily-brief-cron`

## Cost Estimation

### Free Tier Limits
- 25,000 steps/month
- Each brief = 5 steps
- 5,000 briefs/month = 166 briefs/day

### Usage Calculation
- 100 users × 1 brief/day = 100 briefs/day
- 100 × 5 steps = 500 steps/day
- 500 × 30 days = 15,000 steps/month

**Result: Well within free tier!**

### Paid Tier (if needed)
- $20/month for 100,000 steps
- Includes all features + priority support

## Migration from Raindrop Workers

We've completely replaced the Raindrop multi-worker pipeline with Inngest:

### Before (Raindrop - NOT WORKING)
```
orchestrator-worker → data-fetcher-worker → script-generator-worker
  → audio-generator-worker → upload-worker
```

**Issues:**
- Workers stuck "starting..." indefinitely
- No error messages
- Memory limit errors
- Cold start problems

### After (Inngest - WORKING)
```
Single Inngest function with 5 steps
```

**Benefits:**
- No timeouts
- Automatic retries
- Real-time monitoring
- No cold starts
- Proven reliability

## Next Steps

1. ✅ Code implemented
2. ⏳ Test locally with `netlify dev`
3. ⏳ Deploy to Netlify preview
4. ⏳ Set up Inngest Cloud account
5. ⏳ Set environment variables
6. ⏳ Deploy to production
7. ⏳ Sync functions with Inngest
8. ⏳ Test daily brief generation

## Resources

- [Inngest Documentation](https://www.inngest.com/docs)
- [Netlify Functions Guide](https://docs.netlify.com/functions/overview/)
- [Inngest Netlify Integration](https://www.inngest.com/docs/guides/scheduled-functions)
