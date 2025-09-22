FROM node:18-alpine

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Set ownership and switch to non-root user
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Expose port (Railway will set PORT dynamically)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# TEMPORARY: Use minimal test server to debug Railway deployment
CMD ["node", "minimal_test.js"]