.PHONY: up down logs migrate seed help

CYAN := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RESET := \033[0m

help:
	@echo "Available commands:"
	@echo "  make up       - Start all services with Docker"
	@echo "  make down     - Stop all services"
	@echo "  make logs     - Show live logs from all services"
	@echo "  make migrate  - Run Prisma migrations"
	@echo "  make seed     - Seed database with test data"

up:
	@printf "$(YELLOW)Starting Docker Compose...$(RESET)\n"
	docker compose up --build
	@printf "$(GREEN)Docker Compose finished.$(RESET)\n"

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	docker compose exec backend npx prisma migrate dev

seed:
	docker compose exec backend npx prisma db seed

.DEFAULT_GOAL := help
