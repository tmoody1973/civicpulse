# Environment Variables Setup

**Complete guide for configuring HakiVo environment variables**

---

## Required Environment Variables

### 1. **Tavily API** (News Search)
```bash
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxxxxxxxxxxxx
```
- **Get it at:** https://tavily.com
- **Used for:** Fast news search (~500ms)
- **Cost:** $0.001 per search

### 2. **Cerebras Cloud** (AI Synthesis)
```bash
CEREBRAS_API_KEY=csk-xxxxxxxxxxxxxxxxxxxxxxxxxx
```
- **Get it at:** https://cerebras.ai
- **Model:** `gpt-oss-120b` (ultra-fast 120B model)
- **Used for:** News article synthesis
- **Cost:** ~$0.60/M tokens

### 3. **Anthropic Claude** (Bill Analysis)
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxx
```
- **Get it at:** https://console.anthropic.com
- **Model:** `claude-sonnet-4-20250514`
- **Used for:** Bill analysis (high-quality, critical task)
- **Cost:** $3/M input tokens, $15/M output tokens

### 4. **Unsplash** (Image Fallback)
```bash
UNSPLASH_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
```
- **Get it at:** https://unsplash.com/developers
- **Used for:** Article image fallback (when OG images fail)
- **Free tier:** 50 requests/hour

### 5. **WorkOS** (Authentication)
```bash
WORKOS_API_KEY=sk_live_YOUR_KEY_HERE
WORKOS_CLIENT_ID=client_YOUR_CLIENT_ID_HERE
WORKOS_REDIRECT_URI=https://hakivo.netlify.app/api/auth/callback

# Public (client-side)
NEXT_PUBLIC_WORKOS_CLIENT_ID=client_YOUR_CLIENT_ID_HERE
```
- **Get it at:** https://workos.com
- **Used for:** Google/Twitter OAuth

### 6. **Stripe** (Payments)
```bash
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Public (client-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE
```
- **Get it at:** https://stripe.com
- **Used for:** Subscription payments

### 7. **Vultr** (Object Storage for Podcasts)
```bash
VULTR_STORAGE_ENDPOINT=https://ewr1.vultrobjects.com
VULTR_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
VULTR_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
VULTR_CDN_URL=https://cdn.hakivo.com
```
- **Get it at:** https://vultr.com
- **Used for:** Podcast audio storage
- **Note:** S3-compatible

### 8. **ElevenLabs** (Voice Generation)
```bash
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_SARAH_VOICE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_JAMES_VOICE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```
- **Get it at:** https://elevenlabs.io
- **Used for:** Podcast voice generation (text-to-dialogue)

### 9. **Congress.gov API** (Bills & Representatives)
```bash
CONGRESS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
```
- **Get it at:** https://api.congress.gov/sign-up
- **Used for:** Fetching bills, votes, representatives
- **Rate limit:** 1 request/second

### 10. **Raindrop Platform** (Database & Memory)
```bash
RAINDROP_SQL_URL=https://your-raindrop-sql.lmapp.run
RAINDROP_SMART_MEMORY_URL=https://your-smart-memory.lmapp.run
PREFERENCES_SERVICE_URL=https://your-preferences-svc.lmapp.run
```
- **Get it at:** https://raindrop.dev
- **Used for:** SmartSQL, SmartMemory, user preferences

### 11. **Next.js App URL** (Required for API calls)
```bash
# Public (client-side)
NEXT_PUBLIC_APP_URL=https://hakivo.netlify.app
```

### 12. **Cron Job Secret** (Security)
```bash
CRON_SECRET=your-secure-random-string-here
```
- Generate with: `openssl rand -hex 32`
- Used for authenticating scheduled functions

---

## Setting Environment Variables

### Local Development (`.env.local`)

Create `/Users/tarikmoody/Documents/Projects/hakivo/.env.local`:

```bash
# Tavily API (News Search)
TAVILY_API_KEY=tvly-your-key-here

# Cerebras Cloud (AI Synthesis)
CEREBRAS_API_KEY=csk-your-key-here

# Anthropic Claude (Bill Analysis)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Unsplash (Image Fallback)
UNSPLASH_ACCESS_KEY=your-key-here

# WorkOS (Authentication)
WORKOS_API_KEY=sk_test_your-key-here
WORKOS_CLIENT_ID=client_your-id-here
WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback
NEXT_PUBLIC_WORKOS_CLIENT_ID=client_your-id-here

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_test_your-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-secret-here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here

# Vultr (Object Storage)
VULTR_STORAGE_ENDPOINT=https://ewr1.vultrobjects.com
VULTR_ACCESS_KEY=your-access-key
VULTR_SECRET_KEY=your-secret-key
VULTR_CDN_URL=http://localhost:3000/audio

# ElevenLabs (Voice)
ELEVENLABS_API_KEY=your-key-here
ELEVENLABS_SARAH_VOICE_ID=voice-id-here
ELEVENLABS_JAMES_VOICE_ID=voice-id-here

# Congress.gov API
CONGRESS_API_KEY=your-key-here

# Raindrop Platform
RAINDROP_SQL_URL=http://localhost:5432
RAINDROP_SMART_MEMORY_URL=http://localhost:6379
PREFERENCES_SERVICE_URL=http://localhost:3001

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Job Secret
CRON_SECRET=local-dev-secret-12345
```

### Netlify Production

Set via Netlify CLI:

```bash
# Tavily + Cerebras
netlify env:set TAVILY_API_KEY "tvly-your-key-here"
netlify env:set CEREBRAS_API_KEY "csk-your-key-here"

# Anthropic Claude
netlify env:set ANTHROPIC_API_KEY "sk-ant-your-key-here"

# Unsplash
netlify env:set UNSPLASH_ACCESS_KEY "your-key-here"

# WorkOS
netlify env:set WORKOS_API_KEY "sk_live_your-key-here"
netlify env:set WORKOS_CLIENT_ID "client_your-id-here"
netlify env:set WORKOS_REDIRECT_URI "https://hakivo.netlify.app/api/auth/callback"
netlify env:set NEXT_PUBLIC_WORKOS_CLIENT_ID "client_your-id-here"

# Stripe
netlify env:set STRIPE_SECRET_KEY "sk_live_your-key-here"
netlify env:set STRIPE_WEBHOOK_SECRET "whsec_your-secret-here"
netlify env:set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "pk_live_your-key-here"

# Vultr
netlify env:set VULTR_STORAGE_ENDPOINT "https://ewr1.vultrobjects.com"
netlify env:set VULTR_ACCESS_KEY "your-access-key"
netlify env:set VULTR_SECRET_KEY "your-secret-key"
netlify env:set VULTR_CDN_URL "https://cdn.hakivo.com"

# ElevenLabs
netlify env:set ELEVENLABS_API_KEY "your-key-here"
netlify env:set ELEVENLABS_SARAH_VOICE_ID "voice-id-here"
netlify env:set ELEVENLABS_JAMES_VOICE_ID "voice-id-here"

# Congress.gov
netlify env:set CONGRESS_API_KEY "your-key-here"

# Raindrop Platform
netlify env:set RAINDROP_SQL_URL "https://your-sql.lmapp.run"
netlify env:set RAINDROP_SMART_MEMORY_URL "https://your-memory.lmapp.run"
netlify env:set PREFERENCES_SERVICE_URL "https://your-prefs.lmapp.run"

# Next.js
netlify env:set NEXT_PUBLIC_APP_URL "https://hakivo.netlify.app"

# Cron Secret (generate with: openssl rand -hex 32)
netlify env:set CRON_SECRET "your-secure-random-string-here"
```

### Verify Environment Variables

```bash
# List all variables
netlify env:list

# Check specific variable
netlify env:get TAVILY_API_KEY
```

---

## API Cost Estimates

Based on 10,000 active users, 2 news fetches per day:

| Service | Usage | Cost/Month |
|---------|-------|------------|
| **Tavily** | 20k searches | $20 |
| **Cerebras** | ~40M tokens | $24 |
| **Claude** | Bill analysis (10k bills) | $30 |
| **Unsplash** | 5k fallback images | Free |
| **Total** | | **~$74/month** |

**vs Perplexity alone:** ~$200/month → **63% savings!**

---

## Testing APIs

### Test Tavily
```bash
curl -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your-tavily-key",
    "query": "latest congressional news healthcare",
    "max_results": 5
  }'
```

### Test Cerebras
```bash
curl -X POST https://api.cerebras.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-cerebras-key" \
  -d '{
    "model": "gpt-oss-120b",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Test Claude
```bash
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: your-anthropic-key" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## Security Best Practices

1. **Never commit `.env.local`** to git (already in `.gitignore`)
2. **Rotate keys quarterly** (especially CRON_SECRET)
3. **Use different keys** for dev/staging/production
4. **Monitor API usage** in each provider's dashboard
5. **Set billing alerts** to catch unexpected usage
6. **Use Netlify environment contexts** for different environments

---

## Troubleshooting

### "API key not set" errors
- Check spelling of environment variable names
- Restart Next.js dev server after changing `.env.local`
- Verify environment variables in Netlify UI (Site Settings → Environment Variables)

### "Unauthorized" errors
- Verify API key is correct (copy-paste carefully)
- Check API key permissions (some require specific scopes)
- Ensure API key is not expired

### Cron job not running
- Verify `CRON_SECRET` is set in Netlify
- Check cron schedule in `netlify.toml`
- View function logs in Netlify dashboard

---

## Next Steps

1. ✅ Set all environment variables locally
2. ✅ Test APIs with curl commands
3. ✅ Deploy to Netlify
4. ✅ Set production environment variables via Netlify CLI
5. ✅ Test personalized news endpoint
6. ✅ Monitor performance and costs

**Ready to deploy!** 🚀
