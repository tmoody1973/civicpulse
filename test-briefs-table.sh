#!/bin/bash

echo "🔍 Testing if briefs table exists..."
echo ""

curl -X POST https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"briefs","query":"SELECT COUNT(*) as count FROM briefs"}' \
  2>/dev/null | jq '.'
