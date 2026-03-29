FROM node:20-alpine AS base
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm install --workspace=apps/api --omit=dev

# ── Build (generate Prisma client) ───────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api ./apps/api
COPY package*.json ./
RUN npm run --workspace=apps/api db:generate 2>/dev/null || \
    cd apps/api && npx prisma generate

# ── Production image ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only what's needed
COPY --from=builder /app/node_modules          ./node_modules
COPY --from=builder /app/apps/api              ./apps/api
COPY --from=builder /app/package*.json         ./

EXPOSE 3001

# Run migrations then start server
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node src/server.js"]
