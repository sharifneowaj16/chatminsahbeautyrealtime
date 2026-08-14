#!/usr/bin/env bash
set -euo pipefail
if [[ -d node_modules/zod ]]; then
  echo '[realtime/typecheck] dependency-backed full service typecheck'
  exec tsc -p tsconfig.json --noEmit --pretty false
fi
echo '[realtime/typecheck] offline normalized-bridge typecheck (external runtime modules declared, no runtime substitution)'
exec tsc -p tsconfig.verify.json --pretty false
