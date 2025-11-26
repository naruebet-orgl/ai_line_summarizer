# Backend Dockerfile for DigitalOcean App Platform
# Build context: apps/backend (source_dir in app.yaml)

FROM node:18-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (production only)
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Set ownership and switch to non-root user
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "src/server.js"]
