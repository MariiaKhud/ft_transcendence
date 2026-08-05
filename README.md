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

## Recent Updates

- Frontend API layer now uses a shared fetch wrapper in `frontend/src/api/client.ts` with:
	- `credentials: include` by default
	- typed `ApiResponse<T>` parsing
	- typed errors via `ApiClientError`
- Frontend feed/search/article flows now include:
	- article list, article detail, publish, edit, delete
	- comments create/edit/delete
	- article likes
	- follow and friend actions on profile pages
- Backend Prisma packages updated to:
	- `prisma@7.9.1`
	- `@prisma/client@7.9.1`
- OAuth 2.0 (GitHub, Google, 42) is now fully integrated with:
	- dynamic enabled-provider discovery (`GET /api/auth/oauth/providers`)
	- secure state-cookie validation in callback flow
	- OAuth account linking via `oauth_accounts`
	- frontend error mapping for evaluator-visible failure modes

## OAuth 2.0 Minor Module (Implemented)

This project implements the OAuth 2.0 remote authentication minor module with:

- GitHub
- Google
- 42

### OAuth Endpoints

Base path: `/api/auth`

- `GET /api/auth/oauth/providers`
  - Returns enabled providers from backend config.
- `GET /api/auth/oauth/:provider`
  - Starts provider OAuth flow and sets short-lived `oauth_state` cookie.
- `GET /api/auth/oauth/:provider/callback`
  - Validates state, resolves or links user, sets auth cookies, then redirects.

### Required Provider Console Settings

Use exact callback URLs below (no trailing slash changes):

| Provider | App Type           | Callback URL                                            | Required Scope     |
|----------|--------------------|---------------------------------------------------------|--------------------|
| GitHub   | OAuth App          | `https://localhost:8443/api/auth/oauth/github/callback` | `user:email`       |
| Google   | OAuth Client (Web) | `https://localhost:8443/api/auth/oauth/google/callback` | `profile`, `email` |
| 42       | OAuth App          | `https://localhost:8443/api/auth/oauth/42/callback`     | `public`           |

Production callback pattern:

- `https://<your-domain>/api/auth/oauth/github/callback`
- `https://<your-domain>/api/auth/oauth/google/callback`
- `https://<your-domain>/api/auth/oauth/42/callback`

### Environment Variables (OAuth)

Set in root `.env` (or backend env equivalent):

```env
OAUTH_GOOGLE_CLIENT_ID=replace-with-google-client-id
OAUTH_GOOGLE_CLIENT_SECRET=replace-with-google-client-secret
OAUTH_GOOGLE_CALLBACK_URL=https://localhost:8443/api/auth/oauth/google/callback

# If you are not enabling GitHub yet, comment out all 3 GitHub lines.
OAUTH_GITHUB_CLIENT_ID=replace-with-github-client-id
OAUTH_GITHUB_CLIENT_SECRET=replace-with-github-client-secret
OAUTH_GITHUB_CALLBACK_URL=https://localhost:8443/api/auth/oauth/github/callback

OAUTH_42_CLIENT_ID=replace-with-42-client-id
OAUTH_42_CLIENT_SECRET=replace-with-42-client-secret
OAUTH_42_CALLBACK_URL=https://localhost:8443/api/auth/oauth/42/callback

OAUTH_SUCCESS_REDIRECT=https://localhost:8443/
OAUTH_ERROR_REDIRECT=https://localhost:8443/login
```

Important:

- Any partially configured provider (for example only ID without secret) is treated as invalid.
- For GitHub, either fill all 3 GitHub variables or comment all 3.
- Keep client secrets only in local env files, never in Git.

### OAuth Setup Steps

1. Copy env template and fill OAuth credentials.
2. Start stack with `make up`.
3. Verify enabled providers:

```bash
curl -k https://localhost:8443/api/auth/oauth/providers
```

Expected response (example):

```json
{"success":true,"data":["42","github","google"]}
```

4. Open login page and confirm provider buttons are enabled.
5. Complete OAuth with one provider and confirm you are redirected to `/` as authenticated user.

### Login Flow (Evaluator-Facing Behavior)

1. Frontend calls `/api/auth/oauth/providers` and renders only configured providers.
2. User clicks provider button on `/login`.
3. Backend creates `oauth_state` and redirects to provider consent page.
4. Provider redirects to callback URL.
5. Backend validates state, resolves or links local account, sets `auth_token` + `csrf_token` cookies.
6. Backend redirects to success URL (`/`) or login with compact error code (`/login?code=...`).

### Known Limitations

- Local HTTPS uses self-signed certs; browser warning is expected in development.
- OAuth depends on exact callback URL matching in provider console.
- External provider outages or consent screen restrictions can block login.
- First callback with fake/expired authorization code can return token-exchange errors (expected in negative tests).

### Evaluator Validation Steps (Module Evidence)

Use these exact checks during evaluation.

1. Provider discovery:

```bash
curl -k -i https://localhost:8443/api/auth/oauth/providers
```

Expect `200` and enabled providers in JSON.

2. Start OAuth flow for one enabled provider:

```bash
curl -k -i -c /tmp/oauth.cookies https://localhost:8443/api/auth/oauth/github
```

Expect `302` and a provider `Location` redirect.

3. Denied consent path:

- Deny consent on provider page.
- Expect redirect to `/login?code=oauth_provider_denied`.

4. Tampered state path:

- Start OAuth to set `oauth_state` cookie.
- Call callback with mismatched `state` and fake code.
- Expect redirect to `/login?code=oauth_state_invalid`.

5. Reused callback state path:

- Use same valid state twice in callback calls.
- Expect second callback redirect to `/login?code=oauth_state_missing`.

6. Existing-account linking behavior:

- Use OAuth profile with verified email that already exists locally.
- Expect successful login to the existing local user (not duplicate user creation).

7. Run automated evidence scripts:

```bash
bash backend/scripts/test-backend-flow.sh
bash frontend/scripts/test-frontend-flow.sh
```

Both scripts contain OAuth edge-case assertions for denied consent, tampered state, and reused callback state.

Service-level OAuth documentation:

- Backend OAuth API and evidence: `backend/README.md`
- Frontend OAuth UX and evidence: `frontend/README.md`

## Setup Instructions

### Prerequisites
- Git
- Docker Engine + Docker Compose

### 1. Clone

```bash
git clone https://github.com/MariiaKhud/ft_transcendence.git
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
OAUTH_GOOGLE_CLIENT_ID=replace-with-google-client-id
OAUTH_GOOGLE_CLIENT_SECRET=replace-with-google-client-secret
OAUTH_GOOGLE_CALLBACK_URL=https://localhost:8443/api/auth/oauth/google/callback
OAUTH_GITHUB_CLIENT_ID=replace-with-github-client-id
OAUTH_GITHUB_CLIENT_SECRET=replace-with-github-client-secret
OAUTH_GITHUB_CALLBACK_URL=https://localhost:8443/api/auth/oauth/github/callback
OAUTH_42_CLIENT_ID=replace-with-42-client-id
OAUTH_42_CLIENT_SECRET=replace-with-42-client-secret
OAUTH_42_CALLBACK_URL=https://localhost:8443/api/auth/oauth/42/callback
OAUTH_SUCCESS_REDIRECT=https://localhost:8443/
OAUTH_ERROR_REDIRECT=https://localhost:8443/login
```

### 3. Generate a local HTTPS certificate

For local browser testing, generate a localhost certificate and install the local CA where supported:

```bash
make setup-local-cert
```

Then restart nginx:

```bash
docker compose restart nginx
```

> The setup script now bootstraps mkcert automatically when needed, generates the certificate files locally, and keeps them out of Git. If your browser still warns about the certificate, trust the CA from ~/.mkcert/rootCA.pem in your browser or OS certificate store.

### 4. Start the project

```bash
make up
```

### 5. Open the app

- http://127.0.0.1:8080
- https://localhost:8443 (if you want the HTTPS endpoint)

## Browser Compatibility

Tested browsers in this environment:

- Google Chrome
- Chromium
- Microsoft Edge

Current compatibility status:

- Critical user flows were verified against the local app URL at `http://127.0.0.1:8080`.
- Login/registration, feed/article browsing, profile/avatar editing, chat/messaging, and follows/notifications were re-tested successfully.
- Moderator moderation behavior was verified through the automated backend flow.

Known limitations:

- `https://localhost:8443` can still show a certificate warning until the local mkcert CA is trusted in the OS or browser certificate store.
- In this environment, `http://127.0.0.1:8080` is the recommended browser URL for manual testing; `localhost` may be less reliable depending on local browser/network setup.
- Firefox and Safari were not available in this environment, so they were not part of the verified browser matrix.
- Dedicated admin endpoint-path checks depend on local environment configuration (`ROLE_ADMIN_PATH`) and were not fully exercised here.

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
- **Article publishing and detail pages** (create, view, edit, delete)
- **Comments and likes** (create/edit/delete comments, toggle likes)
- **Follow and friend actions** (profile follow/unfollow, friend request flows)
- **Privacy Policy page** (static content, linked from footer, guest accessible)
- **Terms of Service page** (acceptable use, content ownership, moderation policy, guest accessible)
- **Minimal footer links** (Privacy Policy, Terms of Service, GitHub repo)

### In Progress
- Direct messaging
- Notifications
- Gamification (badges, XP, leaderboard)
- Moderation dashboard

## Modules Checklist (Evaluation)

This section tracks only modules that are implemented and currently claimable.

### Claimed Modules

| Category                               | Module                                                              | Type  | Points |
|----------------------------------------|---------------------------------------------------------------------|-------|--------|
| Web                                    | Use a framework for both frontend and backend                       | Major | 2      |
| Web                                    | Use an ORM for the database                                         | Minor | 1      |
| Web                                    | Advanced search functionality (filters, sorting, pagination)        | Minor | 1      |
| Web                                    | Allow users to interact with other users (chat + profile + friends) | Major | 2      |
| User Management                        | Standard user management and authentication                         | Major | 2      |
| User Management                        | OAuth 2.0 remote authentication (GitHub, Google, 42)                | Minor | 1      |
| Web                                    | File upload and management system                                   | Minor | 1      |
| Accessibility and Internationalization | Support for additional browsers                                     | Minor | 1      |

**Claimed subtotal: 11 points**

Evidence used for this checklist:
- Email/password authentication with hashed passwords, session cookies, and `/api/auth/me`
- OAuth 2.0 remote authentication with Google/GitHub/42
- OAuth callback state validation and error-code redirects
- Account linking via `oauth_accounts` with verified-email resolution
- Profile system (public profile page, edit profile, avatar upload/remove)
- File upload and management system (avatar upload, validation, storage, display, delete)
- Friends system (send/accept/decline/remove + status checks)
- Online status backend flow (`/api/users/me/online`, friend records include `isOnline` and `lastSeenAt`)
- Basic chat API (send/receive conversation endpoints)
- Backend integration scripts for friends/messages/follows flows
- Browser compatibility verification across Chrome, Chromium, and Microsoft Edge
- Browser compatibility documentation and known limitations in the README

### Planned Modules to Reach 14 (from team summary)

| Category                   | Module                                                          | Type  | Points | Current Status |
|----------------------------|-----------------------------------------------------------------|-------|--------|----------------|
| User Management            | Advanced permissions system                                     | Major | 2      | In progress    |
| Web                        | Complete notification system (create/update/delete actions)     | Minor | 1      | In progress    |
| Gaming and User Experience | Gamification system (persistent, at least 3 features)           | Minor | 1      | In progress    |
| Web                        | PWA support (installable app, service worker, offline fallback) | Minor | 1      | Planned        |

Optional modules (not required for this 14-point plan): real-time WebSockets, i18n.

### Point Summary

- Mandatory target: **14 points**
- Currently claimed: **11 points**
- Remaining to reach target: **3 points**

> Important: We only claim modules during evaluation when all required criteria in the subject are fully met and demonstrable.

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

- Backend API docs: [backend/README.md](backend/README.md)
- Frontend docs: [frontend/README.md](frontend/README.md)
