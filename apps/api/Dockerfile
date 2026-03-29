FROM node:20-alpine
WORKDIR /app

# Copy root package files (workspace config)
COPY package*.json ./

# Copy API package files
COPY apps/api/package*.json ./apps/api/

# Install all workspace dependencies
RUN npm install --workspace=apps/api

# Copy Prisma schema first (needed for generate)
COPY apps/api/prisma ./apps/api/prisma

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Copy the rest of the API source
COPY apps/api/src ./apps/api/src

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node src/server.js"]
