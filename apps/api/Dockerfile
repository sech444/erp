FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

RUN npm install --workspace=apps/api

COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && npx prisma generate

COPY apps/api/src ./apps/api/src

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node src/server.js"]
