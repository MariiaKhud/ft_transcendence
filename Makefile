.PHONY: up down clean logs migrate seed test-backend test-frontend help

CYAN := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RESET := \033[0m

help:
	@printf "$(CYAN)Available commands:$(RESET)\n"
	@printf "  $(GREEN)make up$(RESET)       - Start all services with Docker\n"
	@printf "  $(GREEN)make down$(RESET)     - Stop all services\n"
	@printf "  $(GREEN)make clean$(RESET)    - Stop services and remove volumes\n"
	@printf "  $(GREEN)make logs$(RESET)     - Show live logs from all services\n"
	@printf "  $(GREEN)make migrate$(RESET)  - Run Prisma migrations\n"
	@printf "  $(GREEN)make seed$(RESET)     - Seed database with test data\n"
	@printf "  $(GREEN)make test-backend$(RESET)  - Run backend flow tests\n"
	@printf "  $(GREEN)make test-frontend$(RESET) - Run frontend smoke tests\n"
	@printf "  $(GREEN)make test-friends$(RESET)  - Run friends flow integration test\n"

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

test-backend:
	cd backend && npm run test:backend

test-frontend:
	cd frontend && npm run test:frontend

test-friends:
	cd backend && ./scripts/test-friends-flow.sh

.DEFAULT_GOAL := help
