# Railway Redis Setup Guide

**Status:** Follow these steps to set up Redis on Railway

---

## Step 1: Login to Railway

Run this in your terminal:

```bash
railway login
```

This will open your browser for authentication. Complete the login process.

---

## Step 2: Initialize Railway Project

```bash
railway init
```

When prompted:
- **Project name:** `hakivo` (or whatever you prefer)
- This creates a new Railway project linked to this directory

---

## Step 3: Add Redis Service

```bash
railway add
```

When prompted, select **Redis** from the list.

Railway will provision a Redis instance (this takes ~30 seconds).

---

## Step 4: Get Redis Connection URL

```bash
railway variables
```

Look for variables that start with `REDIS`. You'll see something like:

```
REDIS_URL=redis://default:PASSWORD@HOSTNAME:PORT
REDIS_PRIVATE_URL=redis://default:PASSWORD@PRIVATE_HOST:PORT
```

**Copy the `REDIS_URL` value** (the public URL).

---

## Step 5: Update Environment Variables

Add the Railway Redis URL to your `.env.local`:

```bash
# Replace the Upstash URL with Railway URL
REDIS_URL="redis://default:your-password@your-railway-host.railway.app:6379"
```

---

## Step 6: Restart Dev Server and Worker

```bash
# Terminal 1: Restart dev server
npm run dev

# Terminal 2: Restart worker
npm run worker
```

---

## Step 7: Test the Queue

```bash
./test-queue-flow.sh
```

You should see:
```
✅ Job created: brief-test_user_hakivo-1234567890
📊 Polling job status...
[1] Status: waiting | Progress: 0%
[2] Status: active | Progress: 10%
...
✅ Brief generation completed!
```

---

## Troubleshooting

### "Cannot connect to Redis"
- Make sure you copied the correct `REDIS_URL`
- Verify Railway Redis service is running: `railway status`
- Check Railway dashboard: https://railway.app

### "railway: command not found"
Railway CLI was just installed. Try:
```bash
npx railway login
npx railway init
npx railway add
npx railway variables
```

---

## Railway Free Tier Limits

Railway's free tier includes:
- ✅ $5/month free credit
- ✅ Redis database included
- ✅ Much better connection limits than Upstash free tier
- ✅ 500GB bandwidth/month
- ✅ No credit card required

**Cost estimate:** Redis typically uses ~$0.50-1/month, well within free tier.

---

## Alternative: Railway Web Dashboard

If CLI doesn't work, use the web UI:

1. Go to https://railway.app
2. Click "New Project"
3. Click "Deploy Redis"
4. Once deployed, click Redis → Variables tab
5. Copy `REDIS_URL` value
6. Add to `.env.local`

---

**Once you have the REDIS_URL, let me know and we'll test the queue!**
