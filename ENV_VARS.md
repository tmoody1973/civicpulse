# Environment Variables Documentation

This document lists all environment variables required for the HakiVo platform.

---

## Deployment Configuration

### `NEXT_PUBLIC_APP_URL`
- **Required**: Yes (Production)
- **Description**: Public URL of the deployed Next.js application
- **Example**: `https://hakivo.netlify.app`
- **Used by**: API routes, OAuth callbacks, CORS configuration

---

## Raindrop Platform

### `RAINDROP_QUEUE_API_URL`
- **Required**: Yes
- **Description**: URL of the Raindrop queue-api service for podcast generation
- **Example**: `https://svc-01k9e5213jbyetdgsvxxap2vt0.01k66gywmx8x4r0w31fdjjfekf.lmapp.run`
- **Used by**: generate-podcast API route, audio-status API route
- **How to get**: Deploy Raindrop app with `raindrop build deploy`, then run `raindrop build find --moduleType service | grep -A 5 "queue-api"`

### `RAINDROP_SQL_URL` (Optional)
- **Required**: No (if using SmartSQL)
- **Description**: Connection string for Raindrop SmartSQL database
- **Example**: `https://smartsql.raindrop.ai/db/civic-db`
- **Used by**: Database queries in Raindrop services

### `RAINDROP_SMART_MEMORY_URL` (Optional)
- **Required**: No (if using SmartMemory)
- **Description**: Connection string for Raindrop SmartMemory
- **Example**: `https://smartmemory.raindrop.ai/memory/user_memory`
- **Used by**: User behavior tracking, personalization

---

## Vultr Object Storage + CDN

### `VULTR_STORAGE_ENDPOINT`
- **Required**: Yes
- **Description**: S3-compatible endpoint for Vultr Object Storage
- **Example**: `https://ewr1.vultrobjects.com`
- **Used by**: Podcast audio uploads

### `VULTR_ACCESS_KEY`
- **Required**: Yes
- **Description**: Access key for Vultr Object Storage
- **Example**: `AKIAIOSFODNN7EXAMPLE`
- **Used by**: S3 client authentication

### `VULTR_SECRET_KEY`
- **Required**: Yes
- **Description**: Secret key for Vultr Object Storage
- **Example**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
- **Used by**: S3 client authentication

### `VULTR_CDN_URL`
- **Required**: Yes
- **Description**: CDN URL for serving podcast audio files
- **Example**: `https://cdn.hakivo.com`
- **Used by**: Audio URL generation, streaming

---

## External APIs

### `CONGRESS_API_KEY`
- **Required**: Yes
- **Description**: API key for Congress.gov API (bill data)
- **Example**: `abcdef123456`
- **Rate Limit**: 1 request/second
- **Used by**: Bill fetching in podcast-queue-handler
- **How to get**: [Register at Congress.gov API](https://api.congress.gov/sign-up/)

### `ANTHROPIC_API_KEY`
- **Required**: Yes
- **Description**: API key for Claude Sonnet 4 (dialogue script generation)
- **Example**: `sk-ant-api03-abcdef123456`
- **Used by**: Podcast dialogue generation
- **How to get**: [Sign up at Anthropic](https://console.anthropic.com/)

### `ELEVENLABS_API_KEY`
- **Required**: Yes
- **Description**: API key for ElevenLabs text-to-dialogue
- **Example**: `abcdef123456`
- **Used by**: Audio generation from dialogue scripts
- **How to get**: [Sign up at ElevenLabs](https://elevenlabs.io/)

### `ELEVENLABS_SARAH_VOICE_ID`
- **Required**: Yes
- **Description**: Voice ID for Sarah (host 1)
- **Example**: `21m00Tcm4TlvDq8ikWAM`
- **Used by**: Audio generation
- **How to get**: Select voice from ElevenLabs dashboard

### `ELEVENLABS_JAMES_VOICE_ID`
- **Required**: Yes
- **Description**: Voice ID for James (host 2)
- **Example**: `AZnzlk1XvdvUeBnXmlld`
- **Used by**: Audio generation
- **How to get**: Select voice from ElevenLabs dashboard

---

## Authentication (WorkOS)

### `WORKOS_API_KEY`
- **Required**: Yes
- **Description**: WorkOS API key for OAuth authentication
- **Example**: `sk_live_abcdef123456`
- **Used by**: OAuth flow (Google, Twitter login)
- **How to get**: [Sign up at WorkOS](https://workos.com/)

### `WORKOS_CLIENT_ID`
- **Required**: Yes
- **Description**: WorkOS OAuth client ID
- **Example**: `client_01H1234567890`
- **Used by**: OAuth authorization URL generation

### `WORKOS_REDIRECT_URI`
- **Required**: Yes
- **Description**: OAuth callback URL
- **Example**: `https://hakivo.netlify.app/api/auth/callback`
- **Used by**: OAuth callback handling

### `NEXT_PUBLIC_WORKOS_CLIENT_ID`
- **Required**: Yes
- **Description**: Public WorkOS client ID (exposed to client)
- **Example**: `client_01H1234567890`
- **Used by**: Frontend OAuth flows

---

## Payments (Stripe)

### `STRIPE_SECRET_KEY`
- **Required**: Yes (if payments enabled)
- **Description**: Stripe secret API key
- **Example**: `sk_live_abcdef123456`
- **Used by**: Payment processing, subscription management
- **How to get**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

### `STRIPE_WEBHOOK_SECRET`
- **Required**: Yes (if payments enabled)
- **Description**: Webhook signing secret for Stripe events
- **Example**: `whsec_abcdef123456`
- **Used by**: Webhook signature verification
- **How to get**: Stripe Dashboard → Webhooks → Add endpoint

### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Required**: Yes (if payments enabled)
- **Description**: Stripe publishable key (exposed to client)
- **Example**: `pk_live_abcdef123456`
- **Used by**: Frontend Stripe.js initialization

---

## Security

### `JWT_SECRET`
- **Required**: Yes
- **Description**: Secret key for JWT token signing
- **Example**: `your-256-bit-secret-key-here`
- **Used by**: Session token generation and verification
- **How to generate**: `openssl rand -base64 32`

---

## Setting Environment Variables

### Development (Local)
Create `.env.local` in project root:

```bash
# Deployment
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Raindrop
RAINDROP_QUEUE_API_URL=https://svc-...lmapp.run

# Vultr
VULTR_STORAGE_ENDPOINT=https://ewr1.vultrobjects.com
VULTR_ACCESS_KEY=your-access-key
VULTR_SECRET_KEY=your-secret-key
VULTR_CDN_URL=https://cdn.hakivo.com

# External APIs
CONGRESS_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
ELEVENLABS_API_KEY=your-key
ELEVENLABS_SARAH_VOICE_ID=voice-id
ELEVENLABS_JAMES_VOICE_ID=voice-id

# Auth
WORKOS_API_KEY=your-key
WORKOS_CLIENT_ID=your-client-id
WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback
NEXT_PUBLIC_WORKOS_CLIENT_ID=your-client-id

# Payments (optional)
STRIPE_SECRET_KEY=your-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-publishable-key

# Security
JWT_SECRET=your-jwt-secret
```

### Production (Netlify)

**Via Netlify CLI:**
```bash
# Login
netlify login

# Link to site
netlify link

# Set individual variables
netlify env:set CONGRESS_API_KEY "your-key"
netlify env:set ANTHROPIC_API_KEY "your-key"
netlify env:set ELEVENLABS_API_KEY "your-key"
# ... etc

# List all variables
netlify env:list
```

**Via Netlify UI:**
1. Go to Site Settings → Environment Variables
2. Add each variable with appropriate scope:
   - **All contexts** (default): Available in all deploy contexts
   - **Production**: Only production deploys
   - **Deploy previews**: Only preview deploys
   - **Branch deploys**: Only specific branches

**Recommended scopes:**
- API keys, secrets: **Production only**
- Public variables (`NEXT_PUBLIC_*`): **All contexts**
- Development/test keys: **Deploy previews**

---

## Validation

Check if all required environment variables are set:

```bash
# Run this in your project directory
node -e "
const required = [
  'CONGRESS_API_KEY',
  'ANTHROPIC_API_KEY',
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_SARAH_VOICE_ID',
  'ELEVENLABS_JAMES_VOICE_ID',
  'VULTR_STORAGE_ENDPOINT',
  'VULTR_ACCESS_KEY',
  'VULTR_SECRET_KEY',
  'WORKOS_API_KEY',
  'WORKOS_CLIENT_ID',
  'RAINDROP_QUEUE_API_URL'
];

const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('❌ Missing environment variables:', missing.join(', '));
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set!');
}
"
```

---

## Troubleshooting

### "Failed to submit job to Raindrop queue"
- Check `RAINDROP_QUEUE_API_URL` is set and correct
- Verify Raindrop app is deployed: `raindrop build find --moduleType service`
- Check CORS headers allow requests from your frontend domain

### "Congress.gov API rate limit exceeded"
- Verify `CONGRESS_API_KEY` is set correctly
- Check rate limit: max 1 request/second
- Implement caching to reduce API calls

### "ElevenLabs API error"
- Verify `ELEVENLABS_API_KEY`, `ELEVENLABS_SARAH_VOICE_ID`, `ELEVENLABS_JAMES_VOICE_ID` are set
- Check your ElevenLabs account has sufficient credits
- Verify voice IDs exist in your ElevenLabs account

### "Unauthorized - WorkOS authentication failed"
- Verify `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_REDIRECT_URI` are set
- Check redirect URI matches exactly what's configured in WorkOS dashboard
- Ensure `NEXT_PUBLIC_WORKOS_CLIENT_ID` is set for client-side OAuth

---

## Security Best Practices

1. **Never commit `.env.local` to git** - Already in `.gitignore`
2. **Use different keys for dev/prod** - Separate API keys for testing
3. **Rotate keys regularly** - Update keys every 90 days
4. **Restrict key permissions** - Use least-privilege principle
5. **Monitor API usage** - Set up alerts for unusual activity
6. **Use Netlify's encrypted storage** - Variables are encrypted at rest

---

## References

- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Raindrop Documentation](https://docs.raindrop.ai/)
- [Congress.gov API Docs](https://api.congress.gov/)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [ElevenLabs API Docs](https://elevenlabs.io/docs)
- [WorkOS Docs](https://workos.com/docs)
- [Stripe API Docs](https://stripe.com/docs/api)
