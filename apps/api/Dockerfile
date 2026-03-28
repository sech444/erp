FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build (if you have a build step, e.g. TypeScript)
RUN npm run build --if-present

EXPOSE 3001
CMD ["npm", "start"]