#!/bin/bash

echo "📝 Creating briefs table in Raindrop SQL (civic-db)..."
echo ""

curl -X POST https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"briefs","query":"CREATE TABLE IF NOT EXISTS briefs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, audio_url TEXT NOT NULL, transcript TEXT, written_digest TEXT, policy_areas TEXT, duration INTEGER, created_at DATETIME NOT NULL)"}' \
  2>/dev/null | jq '.'

echo ""
echo "✅ Testing table creation..."
curl -X POST https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"briefs","query":"SELECT COUNT(*) as count FROM briefs"}' \
  2>/dev/null | jq '.'
