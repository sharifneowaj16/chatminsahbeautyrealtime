# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# prisma schema + config (generate এর জন্য দরকার)
COPY prisma.config.ts ./
COPY prisma ./prisma

# Prisma client generate → prisma/generated/prisma এ যাবে (schema তে output দেখে)
RUN npx prisma generate --schema prisma/schema.prisma

# TypeScript build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production image ───────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# compiled JS
COPY --from=builder /app/dist ./dist

# Prisma generated client (schema তে output = "./generated/prisma" তাই এই path)
COPY --from=builder /app/prisma/generated ./prisma/generated

# prisma schema + migrations (migrate deploy এর জন্য দরকার)
COPY prisma ./prisma

# prisma.config.ts (migrate deploy এ দরকার হয়)
COPY prisma.config.ts ./

# entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

# ✅ start-period=120s দেওয়া হয়েছে:
#    - migration চালাতে ~10-30s
#    - DB + Redis connect করতে ~5-10s
#    - তারপর /health call হবে
# ✅ /health এ DB error হলেও 500 return করে (crash না করে)
#    তাই --retries=5 দেওয়া হয়েছে
HEALTHCHECK --interval=20s --timeout=10s --start-period=120s --retries=5 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["./docker-entrypoint.sh"]
