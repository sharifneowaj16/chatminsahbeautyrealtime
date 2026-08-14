#!/usr/bin/env bash
set -euo pipefail
rm -rf dist
if [[ -d node_modules/zod ]]; then
  echo '[realtime/build] dependency-backed normalized bridge build'
  exec tsc -p tsconfig.json --pretty false
fi
echo '[realtime/build] offline normalized bridge build (external runtime modules declared, no runtime substitution)'
exec tsc -p tsconfig.offline-build.json --noCheck --pretty false
