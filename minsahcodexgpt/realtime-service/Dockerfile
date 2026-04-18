# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# 1. Install all dependencies (devDeps needed for tsc + prisma)
COPY package*.json ./
RUN npm install

# 2. Generate Prisma client
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npx prisma generate

# 3. Compile TypeScript (rootDir=. so output: dist/src/*)
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production image ───────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 4. Production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# 5. Compiled output + generated prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma/generated ./prisma/generated

# 6. Prisma config + schema (for migrate deploy)
COPY prisma.config.ts ./
COPY prisma ./prisma

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/src/index.js"]
