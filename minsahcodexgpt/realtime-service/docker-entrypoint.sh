#!/bin/sh
set -e

echo "Starting realtime service..."
exec node dist/index.js

# #!/bin/sh
# set -e

# echo "[entrypoint] Running database migrations..."
# npx prisma migrate deploy --schema prisma/schema.prisma
# echo "[entrypoint] Migrations complete. Starting server..."

# exec node dist/index.js
