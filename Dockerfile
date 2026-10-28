# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

# Install build dependencies if needed
WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY server ./server
COPY client ./client
COPY storage ./storage
COPY scripts ./scripts
COPY .env.example ./.env.example

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV SESSION_SECRET=cpg_production_session_secret_change_me_in_dashboard

# Ensure storage directories exist and have demo data initialized
RUN node scripts/init-storage.js && node scripts/seed-demo-data.js

# Expose server port
EXPOSE 3000

# Start server
CMD ["node", "server/src/server.js"]
