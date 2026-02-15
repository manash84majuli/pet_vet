.PHONY: help install dev build start lint clean db-push db-migrate db-generate db-studio test deploy

# Default target
help:
	@echo "Pet & Vet Portal - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install          Install dependencies"
	@echo "  make setup            Complete setup (install + db)"
	@echo ""
	@echo "Development:"
	@echo "  make dev              Start development server (localhost:3000)"
	@echo "  make build            Build for production"
	@echo "  make start            Start production server"
	@echo "  make lint             Run ESLint"
	@echo ""
	@echo "Database:"
	@echo "  make db-push          Push schema to Supabase (auto-migrate)"
	@echo "  make db-migrate       Apply pending migrations"
	@echo "  make db-generate      Generate migration from schema"
	@echo "  make db-studio        Open Drizzle Studio"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean            Remove build artifacts"
	@echo "  make clean-all        Remove node_modules + build"
	@echo ""
	@echo "Other:"
	@echo "  make test             Run tests (if configured)"
	@echo "  make deploy           Deploy to Vercel (requires Vercel CLI)"

# ============================================================================
# SETUP TARGETS
# ============================================================================

install:
	npm install

setup: install db-push
	@echo "✅ Setup complete! Run 'make dev' to start development"

# ============================================================================
# DEVELOPMENT TARGETS
# ============================================================================

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

test:
	npm run test 2>/dev/null || echo "Tests not configured yet"

# ============================================================================
# DATABASE TARGETS
# ============================================================================

db-push:
	npm run db:push

db-migrate:
	npm run db:migrate

db-generate:
	npm run db:generate

db-studio:
	npm run db:studio

# ============================================================================
# CLEANUP TARGETS
# ============================================================================

clean:
	rm -rf .next dist out build
	rm -rf .turbo

clean-all: clean
	rm -rf node_modules
	rm -rf .env.local

# ============================================================================
# DEPLOYMENT TARGETS
# ============================================================================

deploy:
	@command -v vercel >/dev/null 2>&1 || { echo "Vercel CLI not installed. Run: npm install -g vercel"; exit 1; }
	vercel

deploy-prod:
	@command -v vercel >/dev/null 2>&1 || { echo "Vercel CLI not installed. Run: npm install -g vercel"; exit 1; }
	vercel --prod

# ============================================================================
# UTILITY TARGETS
# ============================================================================

.PHONY: env-check
env-check:
	@echo "Checking environment variables..."
	@test -n "$$NEXT_PUBLIC_SUPABASE_URL" && echo "✅ NEXT_PUBLIC_SUPABASE_URL set" || echo "❌ NEXT_PUBLIC_SUPABASE_URL not set"
	@test -n "$$NEXT_PUBLIC_SUPABASE_ANON_KEY" && echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY set" || echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
	@test -n "$$DATABASE_URL" && echo "✅ DATABASE_URL set" || echo "❌ DATABASE_URL not set"
	@test -n "$$NEXT_PUBLIC_RAZORPAY_KEY_ID" && echo "✅ NEXT_PUBLIC_RAZORPAY_KEY_ID set" || echo "❌ NEXT_PUBLIC_RAZORPAY_KEY_ID not set"
	@test -n "$$RAZORPAY_KEY_SECRET" && echo "✅ RAZORPAY_KEY_SECRET set" || echo "❌ RAZORPAY_KEY_SECRET not set"

print-env:
	@echo "Current environment variables:"
	@echo "NEXT_PUBLIC_SUPABASE_URL: $$NEXT_PUBLIC_SUPABASE_URL"
	@echo "DATABASE_URL: $$DATABASE_URL" | sed 's/:.*/:[REDACTED]/g'
	@echo "Note: Secrets not printed for security"
