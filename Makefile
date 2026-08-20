.PHONY: help up down clean logs migrate seed setup-local-cert \
		test-backend test-frontend test-browser-compat test-i18n \
		test-friends test-follows test-messages test-gamification \

CYAN := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RESET := \033[0m

help:
	@printf "  $(CYAN)     * * * * * AVAILABLE COMMANDS: * * * * *\n$(RESET)"
	@printf "  $(GREEN)make up$(RESET)               - Start all services with Docker\n"
	@printf "  $(GREEN)make down$(RESET)             - Stop all services\n"
	@printf "  $(GREEN)make clean$(RESET)            - Stop services and remove volumes\n"
	@printf "  $(GREEN)make logs$(RESET)             - Show live logs from all services\n"
	@printf "  $(GREEN)make migrate$(RESET)          - Run Prisma migrations\n"
	@printf "  $(GREEN)make seed$(RESET)             - Seed database with test data\n"
	@printf "  $(GREEN)make setup-local-cert$(RESET) - Generate a trusted local HTTPS certificate for localhost\n"
	@printf "  $(CYAN)\n          * * * * * T E S T S * * * * *\n$(RESET)"
	@printf "  $(GREEN)make test-backend$(RESET)        - Run backend flow tests\n"
	@printf "  $(GREEN)make test-frontend$(RESET)       - Run frontend smoke tests\n"
	@printf "  $(GREEN)make test-browser-compat$(RESET) - Run browser compatibility regression test\n"
	@printf "  $(GREEN)make test-i18n$(RESET)           - Run i18n module regression test\n"
	@printf "  $(GREEN)make test-friends$(RESET)        - Run friends flow integration test\n"
	@printf "  $(GREEN)make test-follows$(RESET)        - Run follows flow integration test\n"
	@printf "  $(GREEN)make test-messages$(RESET)       - Run messages integration test\n"
	@printf "  $(GREEN)make test-gamification$(RESET)   - Run gamification integration test\n"

up:
	@printf "$(YELLOW)Starting Docker Compose...$(RESET)\n"
	docker compose up --build
	@printf "$(YELLOW)Docker Compose finished.$(RESET)\n"

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

.DEFAULT_GOAL := help
