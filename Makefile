# LINE Chat Summarizer AI - Development Makefile
# Usage: make <target>

.PHONY: help dev dev-web dev-backend start clean clean-all install build lint test restart

# Default target
help:
	@echo "LINE Chat Summarizer AI - Development Commands"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Development:"
	@echo "  dev          - Start both frontend and backend in development mode"
	@echo "  dev-web      - Start only the frontend (Next.js)"
	@echo "  dev-backend  - Start only the backend (Express)"
	@echo "  restart      - Clean cache and restart development servers"
	@echo ""
	@echo "Build & Production:"
	@echo "  build        - Build all packages for production"
	@echo "  start        - Start production servers"
	@echo ""
	@echo "Maintenance:"
	@echo "  install      - Install all dependencies"
	@echo "  clean        - Remove node_modules and build artifacts"
	@echo "  clean-all    - Deep clean including .next cache"
	@echo "  clean-cache  - Clean only Next.js cache (quick restart)"
	@echo ""
	@echo "Quality:"
	@echo "  lint         - Run linters on all packages"
	@echo "  test         - Run tests on all packages"
	@echo "  typecheck    - Run TypeScript type checking"

# ============================================================
# DEVELOPMENT
# ============================================================

# Start both frontend and backend
dev:
	@echo "🚀 Starting development servers..."
	pnpm run dev

# Start only frontend
dev-web:
	@echo "🌐 Starting frontend (Next.js)..."
	pnpm run dev:web

# Start only backend
dev-backend:
	@echo "⚙️  Starting backend (Express)..."
	pnpm run dev:backend

# Restart development (clean cache first)
restart: clean-cache
	@echo "🔄 Restarting development servers..."
	pnpm run dev

# ============================================================
# BUILD & PRODUCTION
# ============================================================

build:
	@echo "📦 Building all packages..."
	pnpm run build

start:
	@echo "🏃 Starting production servers..."
	pnpm run start

# ============================================================
# MAINTENANCE
# ============================================================

# Install dependencies
install:
	@echo "📥 Installing dependencies..."
	pnpm install

# Clean node_modules and build artifacts
clean:
	@echo "🧹 Cleaning node_modules and build artifacts..."
	pnpm run clean

# Deep clean including .next cache
clean-all:
	@echo "🧹 Deep cleaning all build artifacts..."
	pnpm run clean:all

# Quick clean - just Next.js cache (useful for hot reload issues)
clean-cache:
	@echo "🧹 Cleaning Next.js cache..."
	rm -rf apps/web/.next
	rm -rf apps/web/tsconfig.tsbuildinfo
	@echo "✅ Cache cleaned"

# ============================================================
# QUALITY
# ============================================================

lint:
	@echo "🔍 Running linters..."
	pnpm run lint

lint-fix:
	@echo "🔧 Running linters with auto-fix..."
	pnpm run lint:fix

test:
	@echo "🧪 Running tests..."
	pnpm run test

typecheck:
	@echo "📝 Running TypeScript type checking..."
	pnpm run typecheck

# ============================================================
# DATABASE
# ============================================================

db-check:
	@echo "🔍 Checking database for issues..."
	pnpm --filter @line-chat-summarizer/backend run db:check

db-cleanup-dry:
	@echo "🧹 Database cleanup (dry run)..."
	pnpm --filter @line-chat-summarizer/backend run db:cleanup

db-cleanup:
	@echo "🧹 Executing database cleanup..."
	pnpm --filter @line-chat-summarizer/backend run db:cleanup:execute

# ============================================================
# SHORTCUTS
# ============================================================

# Quick restart for auth/settings issues
fix-auth: clean-cache
	@echo "🔄 Cleared cache. Restart backend manually, then run 'make dev-web'"
	@echo "Backend: cd apps/backend && pnpm dev"

# Full reset
reset: clean-all install
	@echo "✅ Full reset complete. Run 'make dev' to start."
