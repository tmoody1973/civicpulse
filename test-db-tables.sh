#!/bin/bash

echo "🔍 Checking available tables in Raindrop SQL (civic-db)..."
echo ""

curl -X POST https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"sqlite_master","query":"SELECT name FROM sqlite_master WHERE type='"'table'"' ORDER BY name"}' \
  2>/dev/null | jq -r '.rows[] | .name'
