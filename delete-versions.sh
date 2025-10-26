#!/bin/bash

# Delete remaining civic-pulse versions
versions=(
  "01k8gmweyac8jht3xd4xv4t8ps"
  "01k8gms110xknzvqc5a3zy9hhe"
  "01k8gmdj9ce0sjtphzbdbw3rar"
  "01k8gmc5s1xtk0rpbq01bwnxef"
)

for version in "${versions[@]}"; do
  echo "Deleting version: $version"
  echo "" | raindrop build delete --version "$version" 2>&1 || true
  sleep 1
done

echo "Deletion complete. Checking remaining versions..."
raindrop build list | grep "civic-pulse" -A 10
