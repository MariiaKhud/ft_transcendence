.PHONY: help up dev-start start eval-up eval-down down clean logs migrate seed setup-local-cert \
		test-backend test-frontend test-browser-compat test-i18n \
		test-friends test-follows test-messages test-gamification \
		test-articles test-articles-backend test-articles-frontend \
		test-realtime \
		test-all \

CYAN := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RESET := \033[0m

help:
	@printf "  $(CYAN)     * * * * * AVAILABLE COMMANDS: * * * * *\n$(RESET)"
	@printf "  $(GREEN)make up$(RESET)                     - Start all services with Docker\n"
	@printf "  $(GREEN)make dev-start$(RESET)             - Start development services with hot reload\n"
	@printf "  $(GREEN)make start$(RESET)                  - Start production evaluation services and seed database\n"
	@printf "  $(GREEN)make eval-up$(RESET)               - Start the production evaluation stack without seeding\n"
	@printf "  $(GREEN)make eval-down$(RESET)             - Stop the production evaluation stack\n"
	@printf "  $(GREEN)make down$(RESET)                   - Stop development services\n"
	@printf "  $(GREEN)make clean$(RESET)                  - Stop services and remove volumes\n"
	@printf "  $(GREEN)make logs$(RESET)                   - Show live logs from all services\n"
	@printf "  $(GREEN)make migrate$(RESET)                - Run Prisma migrations\n"
	@printf "  $(GREEN)make seed$(RESET)                   - Seed database with test data\n"
	@printf "  $(GREEN)make setup-local-cert$(RESET)       - Generate a trusted local HTTPS certificate for localhost\n"
	@printf "  $(CYAN)\n          * * * * * T E S T S * * * * *\n$(RESET)"
	@printf "  $(GREEN)make test-backend$(RESET)           - Run backend flow tests\n"
	@printf "  $(GREEN)make test-frontend$(RESET)          - Run frontend smoke tests\n"
	@printf "  $(GREEN)make test-browser-compat$(RESET)    - Run browser compatibility regression test\n"
	@printf "  $(GREEN)make test-i18n$(RESET)              - Run i18n module regression test\n"
	@printf "  $(GREEN)make test-friends$(RESET)           - Run friends flow integration test\n"
	@printf "  $(GREEN)make test-follows$(RESET)           - Run follows flow integration test\n"
	@printf "  $(GREEN)make test-messages$(RESET)          - Run messages integration test\n"
	@printf "  $(GREEN)make test-gamification$(RESET)      - Run gamification integration test\n"
	@printf "  $(GREEN)make test-articles$(RESET)          - Run articles/comments/likes/search tests (backend + frontend)\n"
	@printf "  $(GREEN)make test-articles-backend$(RESET)  - Run articles/comments/likes/search backend tests only\n"
	@printf "  $(GREEN)make test-articles-frontend$(RESET) - Run articles/comments/likes/search frontend proxy tests only\n"
	@printf "  $(GREEN)make test-realtime$(RESET)          - Run Socket.IO live-update + notification-suppression tests\n"
	@printf "  $(GREEN)make test-all$(RESET)               - Run every test suite in sequence\n"

up:
	@printf "$(YELLOW)Starting Docker Compose...$(RESET)\n"
	docker compose up --build
	@printf "$(YELLOW)Docker Compose finished.$(RESET)\n"

dev-start: setup-local-cert
	docker compose up -d --build --wait
	@printf "$(GREEN)Development app is ready at https://localhost:8443$(RESET)\n"

start: eval-up
	$(MAKE) seed
	@printf "$(GREEN)Production evaluation app is ready at https://localhost:8443$(RESET)\n"

eval-up: setup-local-cert
	docker compose -f docker-compose.yml -f docker-compose.eval.yml up -d --build --wait

eval-down:
	docker compose -f docker-compose.yml -f docker-compose.eval.yml down

down:
	docker compose down

clean:
	docker compose down -v

logs:
	docker compose logs -f

migrate:
	docker compose exec backend npx prisma migrate dev

seed:
	docker compose exec backend npx prisma db seed

setup-local-cert:
	./scripts/setup-local-cert.sh

test-backend:
	cd backend && npm run test:backend

test-frontend:
	cd frontend && npm run test:frontend

test-browser-compat:
	cd frontend && node --test scripts/browser-compatibility.test.mjs

test-i18n:
	cd frontend && node --test scripts/i18n.test.mjs

test-friends:
	cd backend && ./scripts/test-friends-flow.sh

test-follows:
	cd backend && ./scripts/test-follows-flow.sh

test-messages:
	cd backend && ./scripts/test-messages.sh

test-gamification:
	cd backend && ./scripts/test-gamification-flow.sh

test-articles-backend:
	cd backend && ./scripts/test-articles-flow.sh

test-articles-frontend:
	cd frontend && ./scripts/test-articles-flow.sh

test-articles: test-articles-backend test-articles-frontend

test-realtime:
	cd backend && ./scripts/test-realtime-flow.sh

# Runs every test suite back to back; stops at the first failure.
test-all:
	$(MAKE) test-backend
	$(MAKE) test-frontend
	$(MAKE) test-browser-compat
	$(MAKE) test-i18n
	$(MAKE) test-friends
	$(MAKE) test-follows
	$(MAKE) test-messages
	$(MAKE) test-gamification
	$(MAKE) test-articles
	$(MAKE) test-realtime


.DEFAULT_GOAL := help
