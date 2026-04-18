#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy
echo "[entrypoint] Migrations complete. Starting server..."

exec node dist/index.js
