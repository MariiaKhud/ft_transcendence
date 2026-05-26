# ft_transcendence

> A Medium-style publishing platform built with React, Express, and PostgreSQL.

## Project Overview

**ft_transcendence** is a team project where users can:
- 📝 Publish and read articles
- 💬 Comment and like articles  
- 👥 Add friends and follow authors
- 💬 Chat with friends
- 🎖️ Earn badges and climb the leaderboard
- 🛡️ Admin dashboard for moderation

---

## Tech Stack

| Component | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React + TypeScript + Tailwind CSS + shadcn/ui |
| Backend   | Node.js + Express + TypeScript                |
| Database  | PostgreSQL + Prisma ORM                       |
| Server    | Docker + Docker Compose + nginx (HTTPS)       |

---

## Setup Instructions

### Prerequisites
- Docker & Docker Compose installed
- Git
- Node.js 18+ (for local development without Docker)

### 1. Clone the repository
```bash
git clone <repo-url>
cd ft_transcendence
```

### 2. Create `.env` file
```bash
cp .env.example .env
```
Then edit `.env` and fill in your values.

### 3. Start the project
```bash
make up
```

This command:
- Builds Docker images for frontend, backend, and database
- Starts all services
- Runs database migrations
- Seeds test data

### 4. Access the app
- Frontend: https://localhost
- Backend API: https://localhost/api

---

## Available Commands

```bash
make up        # Start all services with Docker
make down      # Stop all services
make logs      # Show live logs from all services
make migrate   # Run Prisma migrations
make seed      # Seed database with test data
```

---

## Project Structure

```
ft_transcendence/
├── frontend/           # React app
├── backend/            # Express API
├── shared/types/       # Shared TypeScript types
├── nginx/              # Reverse proxy config
├── uploads/            # User avatar storage
└── docker-compose.yml  # Docker orchestration
```

---

## Team

| Person   | Role                 | Features                              |
|----------|----------------------|---------------------------------------|
| Person 1 | Auth & Users         | Sign up, login, profiles, avatars     |
| Person 2 | Articles & Feed      | Articles, comments, likes, search     |
| Person 3 | Social Layer         | Friends, chat, notifications, follows |
| Person 4 | Gamification & Admin | Badges, leaderboard, moderation       |

---

## Features

### Core Features
- ✅ User authentication (JWT + HttpOnly cookies)
- ✅ Article publishing (Markdown support)
- ✅ Comments and likes
- ✅ Friend system (mutual)
- ✅ Follow system (one-directional)
- ✅ Direct messaging
- ✅ Notifications
- ✅ Gamification (badges, XP, leaderboard)
- ✅ Moderation dashboard
- ✅ PWA (installable app)

---

## Getting Help

See the documentation in each folder:
- `frontend/README.md` — frontend setup
- `backend/README.md` — backend setup

---

## License

School project for Codam (42 Network)
