#!/bin/bash
# Deploy Environment Variables to Netlify
# Sets all required environment variables for the podcast queue fallback system

set -e

echo "🔐 Setting Environment Variables on Netlify"
echo "============================================"
echo ""

# Load .env.local
set -a
source .env.local
set +a

# Critical variables for fallback queue system
echo "📋 Setting critical variables..."

# Internal API Key (for background processor)
echo "  • INTERNAL_API_KEY"
netlify env:set INTERNAL_API_KEY "$INTERNAL_API_KEY" --silent || echo "    (already set or error)"

# Authentication
echo "  • JWT_SECRET"
netlify env:set JWT_SECRET "$JWT_SECRET" --silent || echo "    (already set or error)"

echo "  • WORKOS_API_KEY"
netlify env:set WORKOS_API_KEY "$WORKOS_API_KEY" --silent || echo "    (already set or error)"

echo "  • WORKOS_CLIENT_ID"
netlify env:set WORKOS_CLIENT_ID "$WORKOS_CLIENT_ID" --silent || echo "    (already set or error)"

echo "  • WORKOS_REDIRECT_URI"
netlify env:set WORKOS_REDIRECT_URI "$WORKOS_REDIRECT_URI" --silent || echo "    (already set or error)"

# External APIs (required for podcast generation)
echo "  • CONGRESS_API_KEY"
netlify env:set CONGRESS_API_KEY "$CONGRESS_API_KEY" --silent || echo "    (already set or error)"

echo "  • ANTHROPIC_API_KEY"
netlify env:set ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY" --silent || echo "    (already set or error)"

echo "  • ELEVENLABS_API_KEY"
netlify env:set ELEVENLABS_API_KEY "$ELEVENLABS_API_KEY" --silent || echo "    (already set or error)"

echo "  • ELEVENLABS_SARAH_VOICE_ID"
netlify env:set ELEVENLABS_SARAH_VOICE_ID "$ELEVENLABS_SARAH_VOICE_ID" --silent || echo "    (already set or error)"

echo "  • ELEVENLABS_JAMES_VOICE_ID"
netlify env:set ELEVENLABS_JAMES_VOICE_ID "$ELEVENLABS_JAMES_VOICE_ID" --silent || echo "    (already set or error)"

# Storage (Vultr Object Storage)
echo "  • VULTR_STORAGE_ENDPOINT"
netlify env:set VULTR_STORAGE_ENDPOINT "$VULTR_STORAGE_ENDPOINT" --silent || echo "    (already set or error)"

echo "  • VULTR_ACCESS_KEY"
netlify env:set VULTR_ACCESS_KEY "$VULTR_ACCESS_KEY" --silent || echo "    (already set or error)"

echo "  • VULTR_SECRET_KEY"
netlify env:set VULTR_SECRET_KEY "$VULTR_SECRET_KEY" --silent || echo "    (already set or error)"

echo "  • VULTR_CDN_URL"
netlify env:set VULTR_CDN_URL "$VULTR_CDN_URL" --silent || echo "    (already set or error)"

# Public variables (client-side)
echo "  • NEXT_PUBLIC_APP_URL"
netlify env:set NEXT_PUBLIC_APP_URL "$NEXT_PUBLIC_APP_URL" --silent || echo "    (already set or error)"

echo "  • NEXT_PUBLIC_WORKOS_CLIENT_ID"
netlify env:set NEXT_PUBLIC_WORKOS_CLIENT_ID "$NEXT_PUBLIC_WORKOS_CLIENT_ID" --silent || echo "    (already set or error)"

# Additional APIs (optional but useful)
if [ ! -z "$GEOCODIO_API_KEY" ]; then
  echo "  • GEOCODIO_API_KEY"
  netlify env:set GEOCODIO_API_KEY "$GEOCODIO_API_KEY" --silent || echo "    (already set or error)"
fi

if [ ! -z "$PERPLEXITY_API_KEY" ]; then
  echo "  • PERPLEXITY_API_KEY"
  netlify env:set PERPLEXITY_API_KEY "$PERPLEXITY_API_KEY" --silent || echo "    (already set or error)"
fi

echo ""
echo "✅ Environment variables set successfully!"
echo ""
echo "Verify at: https://app.netlify.com/sites/hakivo/settings/deploys#environment-variables"
echo ""
