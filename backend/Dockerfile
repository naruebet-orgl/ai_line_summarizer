FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Production image, copy all the files and run node
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

# Copy the application
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 3001

ENV PORT=3001
ENV HOST="0.0.0.0"

CMD ["npm", "start"]