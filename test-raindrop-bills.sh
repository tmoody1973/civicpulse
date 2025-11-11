#!/bin/bash

echo "🔍 Testing Raindrop SQL bills table..."
echo ""

# Test 1: Count all bills
echo "1. Counting all bills:"
curl -X POST https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"bills","query":"SELECT COUNT(*) as count FROM bills"}' \
  2>/dev/null | jq '.'

echo ""
echo "2. Sample bills:"
curl -X POST https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"bills","query":"SELECT id, title, issue_categories FROM bills LIMIT 3"}' \
  2>/dev/null | jq '.'

echo ""
echo "3. Bills with healthcare category:"
curl -X POST https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"bills","query":"SELECT COUNT(*) as count FROM bills WHERE issue_categories LIKE '\''%healthcare%'\''"}' \
  2>/dev/null | jq '.'
