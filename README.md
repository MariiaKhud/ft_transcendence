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
- The moderator/admin dashboard is fully translated across all three languages, same as the rest of the app.

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

-----------------------
# Modules

## Web

### Major — Frontend and backend frameworks
**Status: ✅ Covered**  
We use frameworks on both sides of the application:
- **Frontend:** React + TypeScript
- **Backend:** Express + TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma

### Major — WebSockets
**Status: ✅ Covered**  
The application uses Socket.IO for real-time communication.
Implemented real-time functionality includes:
- real-time chat messages
- online/offline presence
- connection and disconnection handling
- broadcasting events to relevant users
- multiple simultaneous connections
- graceful handling of temporary disconnections
The backend maintains user socket connections and uses a 30-second grace period before marking a disconnected user as offline. This prevents short network interruptions or browser reconnects from immediately changing the user's status.

### Major — Allow users to interact with other users
**Status: ✅ Covered**  
The application provides all three required interaction systems.

**Chat**
- open conversations with other users
- send messages
- receive messages in real time
- view conversation history

**Profiles**
- view their own profile
- view other users' profiles
- see profile information
- see avatar, bio, statistics and badges
- see online/offline status

**Friends**
- send friend requests
- accept friend requests
- decline friend requests
- cancel outgoing requests
- remove friends
- view their friends
- see friends' online status

### Minor — ORM
**Status: ✅ Covered**  
The application uses Prisma ORM (Object Relational Mapper) with PostgreSQL.  
Prisma provides:
- database schema
- migrations
- generated client
- typed database queries
- relations between entities

### Minor — Complete notification system
**Status: ✅ Covered**  
The platform provides notification system covering the main social, content, messaging, moderation, and gamification events.  
Notifications use a combination of database persistence, Socket.IO real-time delivery, polling, and browser events. Critical high-frequency events such as messages, comments, likes, and new articles are delivered through Socket.IO, while other persisted notification types are synchronized through polling. This provides both real-time feedback and reliable persistence across page reloads and reconnections.

**Coverage**
| Notification event              | Status    | Evidence           |
| ------------------------------- | :-------: | ------------------ |
| Friend request created          | ✅        | friends.service.ts |
| Friend request accepted         | ✅        | friends.service.ts |
| Follow                          | ✅        | follows.service.ts |
| Unfollow                        | —         | No notification needed |
| Friend removed                  | —         | No notification needed |
| Article published               | ✅        | Followers receive ARTICLE_CREATED |
| Article liked                   | ✅        | Article author receives LIKE |
| Article commented               | ✅        | Article author receives COMMENT |
| Article removed by moderator    | ✅        | Author receives CONTENT_REMOVED |
| Comment removed by moderator    | ✅        | Comment author receives CONTENT_REMOVED |
| Private message                 | ✅        | Socket handler creates MESSAGE |
| Badge earned                    | ✅        | BADGE notification type |
| Level up                        | ✅        | Real-time visual event + notification message |

### Minor —  Progressive Web App
**Status: ✅ Covered**  
The application is implemented as a Progressive Web App (PWA) with installability and offline fallback support.

The PWA provides:
- web app manifest with application metadata and icons
- standalone display mode
- service worker registration
- installability as a standalone application
- cached offline fallback page
- offline navigation fallback when the network is unavailable

### Demonstration

**Installability**

The application can be installed from Chrome using the browser's PWA install control. After installation, the application can be opened as a standalone app without the normal browser navigation interface.

**Offline support**

The service worker caches the offline fallback page. When the network connection is disabled, navigation requests are handled by the service worker and the application displays the cached offline page:

> You are offline  
> Please reconnect to the internet and try again.

Server-dependent functionality, including API requests and real-time communication, requires an active network connection.

### Minor — Custom-made design system
**Status: ✅ Covered**  
We developed a reusable React-based design system with shared components, typography, colors, interactive states and iconography.  
Project has a custom visual identity including:
- custom color palette
- typography
- icons
- reusable React components
- reusable user/profile components
- buttons and UI controls
- notification UI
- navigation components
- dropdowns
- cards
- badges
- level/XP UI

### Minor — Advanced search with filters, sorting and pagination
**Status: ✅ Covered**  
The platform provides a dedicated advanced article search with server-side filtering, sorting, and pagination.  

#### Search and filters

Users can search articles by:

- Title
- Author
- Content
- Category
- Publication date range

#### Sorting

Search results can be sorted by:

- Newest
- Oldest
- Most liked

### Minor — File upload and management
**Status: ✅ Covered**  

| Requirement                     | Status    | Evidence           |
| ------------------------------- | :-------: | ------------------ |
| Multiple file types             | ✅        | Avatar: JPG/PNG/WebP; CV: TXT/PDF/DOC/DOCX |
| Client-side validation          | ✅        | `EditProfile.tsx` checks MIME type and file size before upload |
| Server-side validation          | ✅        | Multer size limits + `validateAvatarMimetype()` / `validateCvMimetype()` |
| Authentication / upload/delete authorization          | ✅        | Upload/delete routes use `authMiddleware` and operate on `req.user.userId` |
| Secure filenames/storage        | ✅        | UUID filenames, controlled upload directory, allowed extensions derived from MIME |
| Preview                         | ✅        | Avatar uses `URL.createObjectURL()` and displays the selected image |
| Delete                          | ✅        | Both avatar and CV have DELETE endpoints and remove the physical file |
| Upload progress                 | ✅        | Implemented loading state `isUploadingAvatar` / `isUploadingCv` |
| Protected file access           | ✅        | Profile and auth responses return protected URLs |

## Accessibility and Internationalization

### Minor — Multiple languages
**Status: ✅ Covered**  
The application supports three languages:
- English
- Nederlands
- Українська
The language switcher allows the user to change the application language.

### Minor — Support for additional browsers
**Status: ✅ Covered**  
The application was tested for browser compatibility across multiple browsers:

| Browser | Platform | Result |
|---|---|---|
| Chrome | Ubuntu | ✅ Passed |
| Microsoft Edge | Ubuntu | ✅ Passed |
| Safari | macOS | ✅ Passed |

## User Management

### Major — User management and authentication
**Status: ✅ Covered**  
The application provides:
- user registration
- user login
- authentication
- logout
- profile editing
- avatar upload
- default avatar handling
- friend management
- online/offline status
- public user profiles

### Major — Advanced permissions system
**Status: ✅ Covered**  
The application implements three hierarchical roles: USER, MODERATOR and ADMIN. Authentication and role-based authorization are enforced server-side through dedicated middleware. Permissions are applied to protected API routes according to role level. Moderators and administrators can moderate articles and comments, while only administrators can manage users and assign roles. The frontend also adapts the available administration interface to the authenticated user's role.  

| Requirement                     | Status    | Evidence           |
| ------------------------------- | :-------: | ------------------ |
| Multiple roles                  | ✅        | USER, MODERATOR, ADMIN |
| Authentication before protected actions | ✅        | authMiddleware |
| Role-based authorization        | ✅        | `requireRole(...)` |
| Different permissions per role  | ✅        | Admin and moderator routes differ |
| Admin user/role management      | ✅        | Admin can manage users and roles |
| Moderator content moderation    | ✅        | Moderator can remove/restore articles/comments |
| Backend enforcement             | ✅        | Permissions are checked server-side, not only in React |
| Frontend role-aware UI          | ✅        | Dashboard and Users tab depend on role |
| Protection against normal users calling admin APIs | ✅        | `requireRole` should reject them |
| Protection against moderator accessing admin-only APIs | ✅        | Admin user-management routes require `ADMIN` |
| An administrator cannot demote and delete another administrator | ✅        | `if (targetUser.role === 'ADMIN' && role !== 'ADMIN')` |
| An admin cannot delete their own account | ✅        | `if (req.user?.userId === id)` |

### Minor — Remote authentication
**Status: ✅ Covered**  
The application implements remote authentication using OAuth 2.0 with the following providers:

- Google
- GitHub
- 42

### Minor — Gamification system
**Status: ✅ Covered**  
The application includes three gamification mechanisms:  

**1. Badges** — Users can earn and display badges.  
**2. Leaderboard** — Users can compare their progress and ranking.  
**3. XP / Level system** — Users earn XP and progress through levels, with a `LevelUpToast` providing immediate feedback on level-up.

-----------------------

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
