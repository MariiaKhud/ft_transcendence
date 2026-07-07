# ft_transcendence

> A Medium-style publishing platform built with React, Express, and PostgreSQL.

## Project Overview

**ft_transcendence** is a team project where users can:
- Publish and read articles
- Comment and like articles
- Add friends and follow authors
- Chat with friends
- Earn badges and climb the leaderboard
- Use an admin dashboard for moderation

## Tech Stack

| Component | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React + TypeScript + Tailwind CSS       |
| Backend   | Node.js + Express + TypeScript          |
| Database  | PostgreSQL + Prisma ORM                 |
| Server    | Docker + Docker Compose + Nginx (HTTPS) |

## Setup Instructions

### Prerequisites
- Git
- Docker Engine + Docker Compose

### 1. Clone

```bash
git clone <your-repository-url>
cd ft_transcendence
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then edit `.env`.

Important for Docker: use `postgres` as DB host, not `localhost`.

```env
DATABASE_URL=postgresql://transcendence:transcendence@postgres:5432/transcendence
JWT_SECRET=change-this-to-a-long-random-secret
BACKEND_PORT=3000
FRONTEND_PORT=5173
NODE_ENV=development
UPLOAD_PATH=./uploads
```

### 3. Start the project

```bash
make up
```

### 4. Open the app

- https://localhost:8443
- http://localhost:8080 (redirects to HTTPS)

## Available Commands

```bash
make up        # build and run all services
make down      # stop all services
make clean     # stop all services and remove volumes
make logs      # stream logs
make migrate   # run prisma migrations in backend container
make seed      # seed database in backend container
```

## Test Commands

Backend flow tests:

```bash
cd backend
npm run test:backend
```

Frontend smoke tests:

```bash
cd frontend
npm run test:frontend
```

## Project Structure

```text
ft_transcendence/
├── frontend/           # React app
├── backend/            # Express API
├── shared/types/       # Shared TypeScript types
├── nginx/              # Reverse proxy config
├── uploads/            # User avatar storage
└── docker-compose.yml  # Docker orchestration
```

## Team

| Person   | Role                 | Features                                |
|----------|----------------------|-----------------------------------------|
| Person 1 | Auth & Users         | Sign up, login, profiles, avatars       |
| Person 2 | Articles & Feed      | Articles, comments, likes, search       |
| Person 3 | Social Layer         | Friends, chat, notifications, follows   |
| Person 4 | Gamification & Admin | Badges, leaderboard, moderation         |

## Features

### Completed ✓
- **User authentication** (JWT + HttpOnly cookies)
- **Session restore on refresh** (frontend restores user via `/api/auth/me`)
- **Profile management** (displayName, bio, avatar upload/delete/preview)
- **Public profiles** (read-only user profiles with stats)
- **Edit profile form** (displayName, bio, avatar upload/delete, field validation)
- **Logout redirect UX** (logout from profile/edit pages redirects to login)
- **Password requirement hints** (short helper text in login/register forms)
- **Global articles feed** (paginated, searchable, filterable by category, sortable)
- **Privacy Policy page** (static content, linked from footer, guest accessible)
- **Terms of Service page** (acceptable use, content ownership, moderation policy, guest accessible)

### In Progress
- Article publishing
- Comments and likes
- Friend and follow systems
- Direct messaging
- Notifications
- Gamification (badges, XP, leaderboard)
- Moderation dashboard

## Service Map (Docker)

| Service     | Internal Port | Host Port (default) |
|-------------|--------------:|--------------------:|
| postgres    | 5432          | not exposed         |
| backend     | 3000          | 3000                |
| frontend    | 5173          | 5173                |
| nginx http  | 80            | 8080                |
| nginx https | 443           | 8443                |

## Troubleshooting (Quick)

- Port conflicts: change host ports in `.env` (`BACKEND_PORT`, `FRONTEND_PORT`, `NGINX_HTTP_PORT`, `NGINX_HTTPS_PORT`).
- TLS warning in browser: expected with local self-signed certs.
- DB connection errors: verify `DATABASE_URL` uses host `postgres` (not `localhost`) when running in Docker.

Rebuild cleanly:

```bash
make down
docker compose up --build
```

## Getting Help

- Backend API docs: `backend/README.md`
- Frontend docs: `frontend/README.md`
