#!/bin/bash

echo "🔍 Testing query with date filter..."
echo ""

# Test the exact query structure used in the function
curl -X POST https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"bills","query":"SELECT COUNT(*) as count FROM bills WHERE (issue_categories LIKE '"'%Health%'"' OR issue_categories LIKE '"'%Education%'"') AND latest_action_date >= datetime('"'now'"', '"'-30 days'"')"}' \
  2>/dev/null | jq '.'

echo ""
echo "Without date filter:"
curl -X POST https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"bills","query":"SELECT COUNT(*) as count FROM bills WHERE (issue_categories LIKE '"'%Health%'"' OR issue_categories LIKE '"'%Education%'"')"}' \
  2>/dev/null | jq '.'
