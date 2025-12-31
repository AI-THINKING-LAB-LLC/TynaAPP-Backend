# Dockerfile pour Tyna Meet - Application complète (Frontend + Backend)

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY index.html ./
COPY index.tsx ./
COPY App.tsx ./
COPY components/ ./components/
COPY services/ ./services/
COPY types.ts ./
COPY vite-env.d.ts ./
COPY public/ ./public/

# Build frontend
RUN npm run build

# Stage 2: Production - Frontend + Backend
FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy backend server files
COPY server-assemblyai.js ./
COPY server-deepgram.js ./
COPY server-google.js ./
COPY server-v3.js ./
COPY server.js ./

# Install serve for serving static files
RUN npm install -g serve

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose ports
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server (serves frontend + WebSocket backend)
CMD ["node", "server-assemblyai.js"]

