FROM node:20-alpine AS base
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
# Copy root package.json (workspaces) + api package.json
COPY package.json ./
COPY apps/api/package.json ./apps/api/
RUN npm install --workspace=apps/api --omit=dev

# ── Generate Prisma client ────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY apps/api ./apps/api
# Generate the Prisma client (needs schema.prisma)
RUN cd apps/api && npx prisma generate

# ── Production runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/apps/api      ./apps/api
COPY --from=builder /app/package.json  ./

EXPOSE 3001

# On startup: run any pending migrations, then start the server
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node src/server.js"]