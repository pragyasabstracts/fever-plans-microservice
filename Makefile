.PHONY: install build start dev test clean help

# Default target
.DEFAULT_GOAL := help

# Install dependencies for both backend and frontend
install:
	@echo "Installing backend dependencies..."
	cd backend && npm install
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Dependencies installed successfully!"

# Build both applications
build:
	@echo "Building backend..."
	cd backend && npm run build
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Build completed successfully!"

# Start production servers
start: build
	@echo "Starting production server..."
	cd backend && npm start

# Start development environment
dev:
	@echo "Starting development environment..."
	@echo "Starting backend in development mode..."
	cd backend && npm run dev &
	@echo "Waiting for backend to start..."
	sleep 3
	@echo "Starting frontend in development mode..."
	cd frontend && npm run dev

# Start backend only
dev-backend:
	@echo "Starting backend in development mode..."
	cd backend && npm run dev

# Start frontend only
dev-frontend:
	@echo "Starting frontend in development mode..."
	cd frontend && npm start

# Run tests
test:
	@echo "Running backend tests..."
	cd backend && npm test
	@echo "Running frontend tests..."
	cd frontend && npm test -- --watchAll=false

# Run tests with coverage
test-coverage:
	@echo "Running backend tests with coverage..."
	cd backend && npm run test:coverage
	@echo "Running frontend tests with coverage..."
	cd frontend && npm test -- --coverage --watchAll=false

# Clean build artifacts and dependencies
clean:
	@echo "Cleaning backend..."
	cd backend && rm -rf dist node_modules coverage data
	@echo "Cleaning frontend..."
	cd frontend && rm -rf build node_modules coverage
	@echo "Cleanup completed!"

# Setup environment files
setup:
	@echo "Setting up environment files..."
	cp .env.example backend/.env
	echo "REACT_APP_API_URL=http://localhost:3000" > frontend/.env
	@echo "Environment files created!"
	@echo "You can now edit backend/.env if needed"

# Lint code
lint:
	@echo "Linting backend code..."
	cd backend && npm run lint

# Fix linting issues
lint-fix:
	@echo "Fixing linting issues..."
	cd backend && npm run lint:fix

# Check service health
health:
	@echo "Checking service health..."
	@curl -s http://localhost:3000/health | jq '.' || echo "Backend service not responding"

# View backend logs (when running in background)
logs:
	@echo "Backend logs:"
	@tail -f backend/logs/combined.log 2>/dev/null || echo "No log file found. Make sure backend is running."

# Stop all background processes
stop:
	@echo "Stopping all Node.js processes..."
	@pkill -f "node.*src/server.ts" || echo "No backend processes found"
	@pkill -f "react-scripts start" || echo "No frontend processes found"
	@echo "All processes stopped"

# Show help
help:
	@echo "Available commands:"
	@echo "  install       - Install dependencies for both backend and frontend"
	@echo "  setup         - Create environment files"
	@echo "  build         - Build both applications for production"
	@echo "  start         - Start production server"
	@echo "  dev           - Start both backend and frontend in development mode"
	@echo "  dev-backend   - Start only backend in development mode"
	@echo "  dev-frontend  - Start only frontend in development mode"
	@echo "  test          - Run all tests"
	@echo "  test-coverage - Run tests with coverage"
	@echo "  clean         - Clean build artifacts and dependencies"
	@echo "  lint          - Check code quality"
	@echo "  lint-fix      - Fix linting issues"
	@echo "  health        - Check service health"
	@echo "  logs          - View backend logs"
	@echo "  stop          - Stop all running processes"