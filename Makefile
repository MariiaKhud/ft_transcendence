.PHONY: up down logs migrate seed help

help:
	@echo "Available commands:"
	@echo "  make up       - Start all services with Docker"
	@echo "  make down     - Stop all services"
	@echo "  make logs     - Show live logs from all services"
	@echo "  make migrate  - Run Prisma migrations"
	@echo "  make seed     - Seed database with test data"

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	docker compose exec backend npx prisma migrate dev

seed:
	docker compose exec backend npx prisma db seed

.DEFAULT_GOAL := help
