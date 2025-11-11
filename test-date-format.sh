#!/bin/bash

echo "🔍 Checking latest_action_date format and values..."
echo ""

curl -X POST https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run/api/admin/query \
  -H "Content-Type: application/json" \
  -d '{"table":"bills","query":"SELECT latest_action_date, COUNT(*) as count FROM bills WHERE issue_categories LIKE '"'%Health%'"' GROUP BY latest_action_date ORDER BY latest_action_date DESC LIMIT 10"}' \
  2>/dev/null | jq '.'
