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
- Self-service account deletion is available from profile settings with confirmation, cascade cleanup, avatar-file cleanup, cleared auth cookies, and a localized post-deletion confirmation on Login.
- Backend Prisma packages updated to:
	- `prisma@7.9.1`
	- `@prisma/client@7.9.1`
- OAuth 2.0 (GitHub, Google, 42) is now fully integrated with:
	- dynamic enabled-provider discovery (`GET /api/auth/oauth/providers`)
	- secure state-cookie validation in callback flow
	- OAuth account linking via `oauth_accounts`
	- frontend error mapping for evaluator-visible failure modes
- Internationalization (i18n) is now fully integrated with:
	- English, Dutch, and Ukrainian translations covering all application UI
	- a navbar language switcher with immediate, no-reload switching
	- account-level persistence (`User.preferredLanguage`) synced across devices, with `localStorage`/browser-detection fallback for guests
	- backend API errors carrying a stable `code` field the frontend translates, instead of raw English error text

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
2. Start the app with `make start`.
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

## Internationalization (i18n) Minor Module (Implemented)

This project implements the "Support for multiple languages" minor module with:

- English (`en`) — default / fallback
- Dutch (`nl`) — Nederlands
- Ukrainian (`uk`) — Українська, including correct CLDR plural forms (one/few/many/other)

### Language Switcher

- A button group in the navbar, reachable from every page, guest or logged in.
- Switching language updates all visible text immediately — no reload.
- The choice is cached to `localStorage` (`i18nextLng`), so it survives a refresh.
- For logged-in users, the choice also syncs to the account (`User.preferredLanguage`, via `PATCH /api/users/me`), so it carries across devices/browsers and is re-applied automatically on the next login or session restore.
- Guests, and accounts with no saved preference, fall back to browser language detection, then English.

### Translation Coverage

- All application UI chrome: navigation, forms, buttons, validation messages, empty states, and the Privacy Policy / Terms of Service pages.
- Backend API error responses include a stable, machine-readable `code` field (e.g. `user_not_found`, `validation_password_length`) alongside the English `error` text. The frontend translates the `code`, so API-originated errors — not just client-side validation — respect the active language.
- User-generated content (article titles/bodies, comments, display names) is intentionally left untranslated, as is the platform's brand name — only application UI chrome is translated.
- The moderator/admin dashboard is still under active development on a separate ticket; its Dutch/Ukrainian translations are intentionally pending until that feature's copy is finalized (falls back to English in the meantime). See [I18N.md](I18N.md#pending-admin-dashboard-translations).

### Evaluator Validation Steps (Module Evidence)

1. Open the app and use the language switcher in the navbar to switch between English / Nederlands / Українська. Confirm visible text changes immediately (no reload) across the home feed, login/register forms, search, and the Privacy Policy / Terms of Service pages.
2. Refresh the page after switching. Confirm the chosen language persists.
3. Register or log in, switch language while logged in, then check that the preference was saved to the account. A browser login doesn't give you a cookie jar `curl` can reuse, so log in via `curl` too (same account, separate session):

```bash
curl -k -s -c /tmp/i18n.cookies -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<your-test-email>","password":"<your-test-password>"}' > /dev/null

curl -k -s -b /tmp/i18n.cookies https://localhost:8443/api/auth/me
```

Expect the `preferredLanguage` field in the response to match your last selection. Logging in again (or from a different browser with the same account) re-applies it automatically.

4. Trigger a validation error in Dutch or Ukrainian — for example submit the login form empty, or register with a username that is already taken — and confirm the error message is translated, not English.
5. Run the automated i18n test suite:

```bash
cd frontend && node --test scripts/i18n.test.mjs
```

Covers: key parity across all three language bundles, correct Ukrainian plural forms, translated Privacy Policy/Terms of Service content, and that every backend error `code` has a matching translation in all three languages.

### Known Limitations

- Dutch and Ukrainian translations (including the legal pages) were produced by the development team without a native-speaker or legal review pass; content and structure are complete and consistent across all three languages, but wording has not been professionally reviewed.

Full design decisions, architecture, translation-key conventions, and manual test steps: [I18N.md](I18N.md).

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

### 3. Start the project

```bash
make start
```

`make start` generates the local HTTPS certificate, starts the containers, waits
for the backend, and seeds the database. If your browser still warns about the
certificate, trust the CA from `~/.mkcert/rootCA.pem` in your browser or OS
certificate store.

### 4. Open the app

- https://localhost:8443

## Browser Compatibility

Tested browsers in this environment:

- Google Chrome
- Microsoft Edge
- Chromium

Current compatibility status:

- Critical user flows were verified against the local app URL at `https://localhost:8443`.
- Login/registration, feed/article browsing, profile/avatar editing, chat/messaging, and follows/notifications were re-tested successfully in Microsoft Edge and Chromium.
- Moderator moderation behavior was verified through the automated backend flow.

Known limitations:

- `https://localhost:8443` can still show a certificate warning until the local mkcert CA is trusted in the OS or browser certificate store.
- Firefox was not available in this environment and was not part of the verified browser matrix.
- Dedicated admin endpoint-path checks depend on local environment configuration (`ROLE_ADMIN_PATH`) and were not fully exercised here.

## Available Commands

```bash
make start         # generate HTTPS cert, start services, and seed database
make up            # build and run all services in the foreground
make down          # stop all services
make clean         # stop all services and remove volumes
make logs          # stream logs
make migrate       # run prisma migrations in backend container
make seed          # seed database in backend container
make test-realtime # run Socket.IO realtime integration tests
make test-all      # run every automated test suite
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

Socket.IO realtime tests (chat, live comment/like updates, and notifications):

```bash
make test-realtime
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
- **Profile management** (displayName, bio, avatar upload/delete/preview, CV upload/delete)
- **CV document upload and download** (TXT, PDF, DOC, DOCX; validation, replacement cleanup, and public profile download)
- **Public profiles** (read-only user profiles with stats)
- **Edit profile form** (displayName, bio, avatar upload/delete, field validation)
- **Self-service account deletion** (confirmation, cascade cleanup, session clearing)
- **Logout redirect UX** (logout from profile/edit pages redirects to login)
- **Password requirement hints** (short helper text in login/register forms)
- **Global articles feed** (paginated, searchable, filterable by category, sortable)
- **Article publishing and detail pages** (create, view, edit, delete)
- **Comments and likes** (create/edit/delete comments, toggle likes)
- **Follow and friend actions** (profile follow/unfollow, friend request flows)
- **Direct messaging** (persistent conversations with real-time message delivery)
- **Notification center** (real-time notification bell, read state, and paginated notification page)
- **Gamification** (persistent XP, levels, badges, and leaderboard)
- **Admin dashboard and API** (role management and article/comment moderation)
- **Real-time updates** (Socket.IO for chat, online status, notifications, comments, likes, and feed statistics)
- **Progressive Web App** (install manifest, service worker, and offline navigation fallback)
- **Privacy Policy page** (static content, linked from footer, guest accessible)
- **Terms of Service page** (acceptable use, content ownership, moderation policy, guest accessible)
- **Minimal footer links** (Privacy Policy, Terms of Service, GitHub repo)
- **Internationalization** (English, Dutch, Ukrainian — full UI coverage outside the in-progress admin dashboard, navbar language switcher, account-level persistence, translated API error codes)

### In Progress
- Advanced permissions system: user listing and role management are complete, but full user CRUD is not yet claimable.
- Complete notification coverage for every creation, update, and deletion action is not yet claimable.

## Modules Checklist (Evaluation)

This section tracks only modules that are implemented and currently claimable.

### Claimed Modules

| Category                               | Module                                                                | Type  | Points |
|----------------------------------------|-----------------------------------------------------------------------|-------|--------|
| Web                                    | Use a framework for both frontend and backend                         | Major | 2      |
| Web                                    | Use an ORM for the database                                           | Minor | 1      |
| Web                                    | Advanced search functionality (filters, sorting, pagination)          | Minor | 1      |
| Web                                    | Allow users to interact with other users (chat + profile + friends)   | Major | 2      |
| User Management                        | Standard user management and authentication                           | Major | 2      |
| User Management                        | OAuth 2.0 remote authentication (GitHub, Google, 42)                  | Minor | 1      |
| Web                                    | Real-time features using WebSockets                                   | Major | 2      |
| Gaming and User Experience             | Gamification system (XP, levels, badges, leaderboard)                 | Minor | 1      |
| Web                                    | Progressive Web App with offline support and installability           | Minor | 1      |
| Web                                    | Custom-made design system with reusable components                    | Minor | 1      |
| Web                                    | File upload and management system (images and CV documents)          | Minor | 1      |
| Accessibility and Internationalization | Support for multiple languages (English, Dutch, Ukrainian)            | Minor | 1      |
| Accessibility and Internationalization | Support for additional browsers (Microsoft Edge, Chromium)            | Minor | 1      |

**Claimed subtotal: 17 points**

Evidence used for this checklist:
- Email/password authentication with hashed passwords, session cookies, and `/api/auth/me`
- OAuth 2.0 remote authentication with Google/GitHub/42
- OAuth callback state validation and error-code redirects
- Account linking via `oauth_accounts` with verified-email resolution
- Profile system (public profile page, edit profile, avatar upload/remove)
- Friends system (send/accept/decline/remove + status checks)
- Online status backend flow (`/api/users/me/online`, friend records include `isOnline` and `lastSeenAt`)
- Real-time Socket.IO connections with authenticated users, online/offline events, chat messages, notifications, and article/feed updates
- Persistent gamification: XP, level calculation, badges, and leaderboard data stored in PostgreSQL
- PWA manifest, application icons, service-worker registration, and an offline navigation fallback
- File uploads: avatar images plus TXT, PDF, DOC, and DOCX CV documents with frontend/backend type and size validation, replacement cleanup, deletion, and profile download
- Custom design system with reusable components: Button, icon set, ArticleCard, ArticleForm, UserAvatar, UserMenu, UserSearchBar, FriendButton, FollowButton, NotificationBell, MessageButtonLink, XPBar, BadgeList, and admin dashboard components
- Shared visual language: Tailwind CSS, purple/fuchsia/emerald status palette, reusable button variants, typography, spacing, borders, and icon components
- Backend integration scripts for friends/messages/follows flows
- Manual compatibility checks in Microsoft Edge and Chromium for core authentication, content, profile, social, and responsive UI flows
- i18n: 3 complete languages (English, Dutch, Ukrainian) across all shipped UI, navbar language switcher, `localStorage` + account-level (`preferredLanguage`) persistence, translated backend API error codes
- Automated i18n regression suite (`frontend/scripts/i18n.test.mjs`) plus a live multi-language, multi-page QA pass (see Internationalization section above)

### Additional Modules Not Yet Claimed

| Category                               | Module                                                          | Type  | Points | Current Status                            |
|----------------------------------------|-----------------------------------------------------------------|-------|--------|-------------------------------------------|
| User Management                        | Advanced permissions system                                     | Major | 2      | Partial: lacks full user CRUD             |
| Web                                    | Complete notification system (create/update/delete actions)     | Minor | 1      | Partial: coverage is not complete         |

### Point Summary

- Mandatory target: **14 points**
- Currently claimed: **17 points**
- Above the mandatory target by: **3 points**

> Important: We only claim modules during evaluation when all required criteria in the subject are fully met and demonstrable.

## Service Map (Docker)

| Service     | Internal Port | Host Port (default) |
|-------------|--------------:|--------------------:|
| postgres    | 5432          | not exposed         |
| backend     | 3000          | not exposed         |
| frontend    | 5173          | 5173                |
| nginx http  | 80            | 8080                |
| nginx https | 443           | 8443                |

## Troubleshooting (Quick)

- Port conflicts: change host ports in `.env` (`BACKEND_PORT`, `FRONTEND_PORT`, `NGINX_HTTP_PORT`, `NGINX_HTTPS_PORT`).
- TLS warning in browser: expected with local self-signed certs.
- DB connection errors: verify `DATABASE_URL` uses host `postgres` (not `localhost`) when running in Docker.

Rebuild cleanly:

```bash
make clean
make start
```

## Getting Help

- Backend API docs: [backend/README.md](backend/README.md)
- Frontend docs: [frontend/README.md](frontend/README.md)
