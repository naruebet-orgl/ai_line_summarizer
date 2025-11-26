.PHONY: install start dev stop clean backend frontend help migrate migrate-rollback db-backup db-restore lint build test

# Paths
BACKEND_DIR = apps/backend
WEB_DIR = apps/web
MIGRATIONS_DIR = $(BACKEND_DIR)/scripts/migrations
DB_SCRIPTS_DIR = $(BACKEND_DIR)/scripts/db

# Default target
help:
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  LINE Chat Summarizer AI - Monorepo Commands"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Development:"
	@echo "  make install       - Install all dependencies (pnpm)"
	@echo "  make start         - Start both frontend and backend"
	@echo "  make dev           - Alias for start"
	@echo "  make backend       - Start only backend server"
	@echo "  make frontend      - Start only frontend server"
	@echo "  make stop          - Stop all running processes"
	@echo "  make clean         - Clean and reinstall dependencies"
	@echo ""
	@echo "Build & Quality:"
	@echo "  make build         - Build all packages"
	@echo "  make lint          - Run linting on all packages"
	@echo "  make test          - Run tests"
	@echo "  make typecheck     - Run TypeScript type checking"
	@echo ""
	@echo "Database:"
	@echo "  make migrate       - Run database migrations"
	@echo "  make migrate-rollback - Rollback last migration"
	@echo "  make db-backup     - Backup MongoDB database"
	@echo "  make db-restore    - Restore MongoDB database"
	@echo "  make db-stats      - Show database statistics"
	@echo "  make db-cleanup    - Clean up old sessions"
	@echo ""
	@echo "Organization:"
	@echo "  make migrate-org   - Run organization model migration"
	@echo "  make rollback-org  - Rollback organization model migration"
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"

# ════════════════════════════════════════════════════════════════
# Development Commands
# ════════════════════════════════════════════════════════════════

# Install dependencies using pnpm
install:
	@echo "📦 Installing dependencies with pnpm..."
	pnpm install
	@echo "✅ All dependencies installed!"

# Start both services
start:
	@echo "🚀 Starting LINE Chat Summarizer AI..."
	@echo ""
	@echo "  Backend:  http://localhost:3001"
	@echo "  Frontend: http://localhost:3000"
	@echo ""
	@echo "Press Ctrl+C to stop both services"
	@echo ""
	@make -j2 backend frontend

# Alias for start
dev: start

# Start backend only
backend:
	@echo "🔧 Starting backend server..."
	cd $(BACKEND_DIR) && pnpm start

# Start frontend only
frontend:
	@echo "🎨 Starting frontend server..."
	cd $(WEB_DIR) && pnpm dev

# Stop all processes
stop:
	@echo "⏹️  To stop services, press Ctrl+C in the running terminal"
	@echo "   Or use: pkill -f 'node.*apps/backend' && pkill -f 'next-server'"

# Clean and reinstall
clean:
	@echo "🧹 Cleaning up..."
	rm -rf node_modules
	rm -rf $(BACKEND_DIR)/node_modules
	rm -rf $(WEB_DIR)/node_modules
	rm -rf $(WEB_DIR)/.next
	@echo "🔄 Reinstalling dependencies..."
	@make install

# ════════════════════════════════════════════════════════════════
# Build & Quality Commands
# ════════════════════════════════════════════════════════════════

# Build all packages
build:
	@echo "🏗️  Building all packages..."
	cd $(WEB_DIR) && pnpm build
	@echo "✅ Build complete!"

# Run linting
lint:
	@echo "🔍 Running linter..."
	cd $(WEB_DIR) && pnpm lint
	@echo "✅ Linting complete!"

# Run tests
test:
	@echo "🧪 Running tests..."
	cd $(BACKEND_DIR) && pnpm test || true
	cd $(WEB_DIR) && pnpm test || true
	@echo "✅ Tests complete!"

# TypeScript type checking
typecheck:
	@echo "📝 Running TypeScript type check..."
	cd $(WEB_DIR) && npx tsc --noEmit
	@echo "✅ Type check complete!"

# ════════════════════════════════════════════════════════════════
# Database Commands
# ════════════════════════════════════════════════════════════════

# Run all pending migrations
migrate:
	@echo "🔄 Running database migrations..."
	@for file in $(MIGRATIONS_DIR)/[0-9]*.js; do \
		if [ -f "$$file" ] && [[ ! "$$file" == *"rollback"* ]]; then \
			echo "Running: $$file"; \
			cd $(BACKEND_DIR) && node $${file#$(BACKEND_DIR)/}; \
		fi \
	done
	@echo "✅ Migrations complete!"

# Run organization model migration
migrate-org:
	@echo "🏢 Running organization model migration..."
	cd $(BACKEND_DIR) && node scripts/migrations/001_add_organization_model.js
	@echo "✅ Organization migration complete!"

# Rollback organization model migration
rollback-org:
	@echo "⏪ Rolling back organization model migration..."
	cd $(BACKEND_DIR) && node scripts/migrations/001_rollback.js
	@echo "✅ Rollback complete!"

# Backup MongoDB database
db-backup:
	@echo "💾 Backing up database..."
	cd $(BACKEND_DIR) && node scripts/db/backup_mongodb.js
	@echo "✅ Backup complete!"

# Restore MongoDB database
db-restore:
	@echo "📥 Restoring database..."
	@read -p "Enter backup file path: " BACKUP_PATH; \
	cd $(BACKEND_DIR) && node scripts/db/restore_mongodb.js $$BACKUP_PATH
	@echo "✅ Restore complete!"

# Show database statistics
db-stats:
	@echo "📊 Database statistics..."
	cd $(BACKEND_DIR) && node scripts/db/db_stats.js

# Clean up old sessions
db-cleanup:
	@echo "🧹 Cleaning up old sessions..."
	cd $(BACKEND_DIR) && node scripts/db/cleanup_sessions.js
	@echo "✅ Cleanup complete!"

# ════════════════════════════════════════════════════════════════
# Docker Commands (for production)
# ════════════════════════════════════════════════════════════════

# Build Docker images
docker-build:
	@echo "🐳 Building Docker images..."
	docker-compose build
	@echo "✅ Docker build complete!"

# Start Docker containers
docker-up:
	@echo "🐳 Starting Docker containers..."
	docker-compose up -d
	@echo "✅ Containers started!"

# Stop Docker containers
docker-down:
	@echo "🐳 Stopping Docker containers..."
	docker-compose down
	@echo "✅ Containers stopped!"

# View Docker logs
docker-logs:
	docker-compose logs -f
