#!/bin/bash

echo "🔍 Finding issue categories in bills table..."
echo ""

# Get distinct issue categories (first 20)
curl -X POST https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"bills","query":"SELECT DISTINCT issue_categories FROM bills WHERE issue_categories IS NOT NULL AND issue_categories != '\''[]'\'' LIMIT 20"}' \
  2>/dev/null | jq '.rows[] | .issue_categories' | head -20

echo ""
echo "Testing JSON search for 'Health':"
curl -X POST https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"bills","query":"SELECT COUNT(*) as count FROM bills WHERE issue_categories LIKE '\''%Health%'\''"}' \
  2>/dev/null | jq '.'
