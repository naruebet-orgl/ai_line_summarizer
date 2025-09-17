.PHONY: install start dev stop clean backend frontend help

# Default target
help:
	@echo "Available commands:"
	@echo "  make install   - Install dependencies for both frontend and backend"
	@echo "  make start     - Start both frontend and backend in development mode"
	@echo "  make dev       - Alias for start"
	@echo "  make backend   - Start only the backend server"
	@echo "  make frontend  - Start only the frontend server"
	@echo "  make stop      - Stop all running processes"
	@echo "  make clean     - Clean node_modules and reinstall dependencies"
	@echo "  make help      - Show this help message"

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && npm install
	@echo "Installing frontend dependencies..."
	cd web && npm install
	@echo "✅ All dependencies installed!"

# Start both services
start:
	@echo "🚀 Starting LINE Chat Summarizer AI..."
	@echo "Backend will run on http://localhost:3001"
	@echo "Frontend will run on http://localhost:3000"
	@echo ""
	@echo "Press Ctrl+C to stop both services"
	@echo ""
	make -j2 backend frontend

# Alias for start
dev: start

# Start backend only
backend:
	@echo "🔧 Starting backend server..."
	cd backend && npm start

# Start frontend only
frontend:
	@echo "🎨 Starting frontend server..."
	cd web && npm run dev

# Stop all processes (manual - user needs to Ctrl+C)
stop:
	@echo "To stop the services, press Ctrl+C in the terminal where they're running"

# Clean and reinstall
clean:
	@echo "🧹 Cleaning up..."
	rm -rf backend/node_modules
	rm -rf web/node_modules
	@echo "🔄 Reinstalling dependencies..."
	make install