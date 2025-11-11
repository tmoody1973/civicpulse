#!/bin/bash
# Set all required environment variables for Raindrop deployment

echo "🔐 Setting Raindrop environment variables..."

# Source env vars from .env.local
export $(grep -v '^#' .env.local | xargs)

# Set each required env var
raindrop build env set env:ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY"
raindrop build env set env:ELEVENLABS_API_KEY "$ELEVENLABS_API_KEY"
raindrop build env set env:ELEVENLABS_SARAH_VOICE_ID "$ELEVENLABS_SARAH_VOICE_ID"
raindrop build env set env:ELEVENLABS_JAMES_VOICE_ID "$ELEVENLABS_JAMES_VOICE_ID"
raindrop build env set env:VULTR_STORAGE_ENDPOINT "$VULTR_STORAGE_ENDPOINT"
raindrop build env set env:VULTR_ACCESS_KEY "$VULTR_ACCESS_KEY"
raindrop build env set env:VULTR_SECRET_KEY "$VULTR_SECRET_KEY"
raindrop build env set env:VULTR_CDN_URL "$VULTR_CDN_URL"
raindrop build env set env:BRAVE_SEARCH_API_KEY "$BRAVE_SEARCH_API_KEY"
raindrop build env set env:PEXELS_API_KEY "$PEXELS_API_KEY"

echo "✅ All environment variables set!"
