# Backend

Express + TypeScript API for ft_transcendence.

## Dependency Notes

- Prisma CLI: `7.9.1`
- Prisma Client: `7.9.1`

To update Prisma packages:

```bash
npm i --save-dev prisma@latest
npm i @prisma/client@latest
```

## What This Service Does

### Completed ✓
- **User authentication** (`register`, `login`, `logout`, `me`)
- **Public profile read** (`GET /api/users/:username`) — displayName, bio, stats
- **Public profile article list** (`GET /api/users/:username/articles`)
- **User profile updates** (`PATCH /api/users/me`) — displayName, bio, preferred language with validation
- **Self-account deletion** (`DELETE /api/users/me`) — permanently deletes the authenticated user's account and cascaded data
- **Avatar management** (`POST /api/users/me/avatar`) — upload PNG/JPG, max 2MB
- **Avatar delete** (`DELETE /api/users/me/avatar`) — remove user avatar
- **CV management** (`POST/DELETE /api/users/me/cv`) — upload, replace, and remove TXT/PDF/DOC/DOCX CV files, max 5MB
- **Global articles feed** (`GET /api/articles`) — paginated, searchable, filterable, sortable
- **Article CRUD** (`POST/PATCH/DELETE /api/articles/:id` + `GET /api/articles/:id`)
- **Article comments** (`GET/POST /api/articles/:id/comments`, `PATCH/DELETE /api/comments/:id`)
- **Article likes** (`POST /api/articles/:id/like`)
- **Friends API** (`/api/friends/*` request, respond, cancel, list, remove, status)
- **Follows API** (`/api/follows/*` follow, unfollow, status)
- **Messages API** (`GET/POST /api/messages/:userId`)
- **Notifications API** (`GET /api/notifications`, mark one/all read)
- **Leaderboard API** (`GET /api/users/leaderboard`)
- **Admin API** (`/api/admin/*`) for user roles and content moderation
- **Gamification services** (persistent XP, levels, badge awarding, leaderboard data)
- **Socket.IO server** (authenticated real-time chat, notifications, online status, comments, likes, and feed updates)
- **Custom frontend design system** (reusable UI components, shared color palette, typography, and icons)
- Cookie-based auth session with JWT and CSRF token checks
- Prisma integration for PostgreSQL
- Centralized error handling with typed API responses

### Module Limits
- Avatar upload supports JPEG, PNG, and WebP images. It does not yet support document uploads.
- Role management and moderation are available, but full user CRUD is not yet implemented.

## Run Modes

### A) Recommended: via root Docker setup

From repository root:

```bash
make start
```

This one command generates the local HTTPS certificate, starts the containers,
waits for the backend, and seeds the database.

Backend is available through Nginx at:

- https://localhost:8443/api

### B) Local backend development

From `backend/`:

```bash
npm install
npm run dev
```

`npm run dev` starts the backend on its internal development port. Do not access
that port from a browser, script, or external client; use the Docker/Nginx HTTPS
endpoint at `https://localhost:8443/api` for all public API requests.

## Environment Variables

| Name           | Description                           | Example                                                                |
|----------------|---------------------------------------|------------------------------------------------------------------------|
| `NODE_ENV`     | runtime mode                          | `development`                                                          |
| `PORT`         | backend port inside container/process | `3000`                                                                 |
| `DATABASE_URL` | prisma postgres connection string     | `postgresql://transcendence:transcendence@postgres:5432/transcendence` |
| `JWT_SECRET`   | secret for signing auth tokens        | `long-random-value`                                                    |
| `UPLOAD_PATH`  | file upload path                      | `./uploads`                                                            |

### OAuth 2.0 Variables (Google, GitHub, 42)

Recommended multi-provider format:

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

Provider console callback URLs must match exactly:

- GitHub: `https://localhost:8443/api/auth/oauth/github/callback`
- Google: `https://localhost:8443/api/auth/oauth/google/callback`
- 42: `https://localhost:8443/api/auth/oauth/42/callback`

Notes:

- Partially configured providers are treated as invalid and not enabled.
- For GitHub, either set all 3 GitHub variables or comment all 3.
- Keep OAuth secrets in local env files only.

## NPM Scripts

```bash
npm run dev          # tsx watch server
npm run build        # compile TypeScript
npm run start        # run compiled build
npm run db:migrate   # prisma migrate dev
npm run db:seed      # prisma db seed
npm run db:reset     # reset prisma database
npm run type-check   # TypeScript type check
npm run test:backend # backend flow bash test script
npm run test:auth    # alias of test:backend
```

Run Socket.IO realtime integration tests from the repository root:

```bash
make test-realtime
```

## Auth API

Base path: `/api/auth`

### POST /api/auth/register

Creates a user account.

Request body:

```json
{
  "email": "new.user@example.com",
  "username": "new_user",
  "password": "strongPass123",
  "displayName": "New User"
}
```

Validation:

- `email`: valid format
- `username`: 3-20 chars, letters/numbers/underscore
- `password`: 8-72 chars (length rule only; complexity checks are handled by frontend hints)

Success: `201`

```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "new.user@example.com",
    "username": "new_user",
    "displayName": "New User",
    "avatarUrl": null,
    "bio": null,
    "role": "USER",
    "xp": 0,
    "level": 1,
    "isOnline": false,
    "lastSeenAt": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### POST /api/auth/login

Authenticates user and sets cookies:

- `auth_token` (httpOnly)
- `csrf_token` (readable by client, validated on protected state-changing requests)

Request body:

```json
{
  "email": "new.user@example.com",
  "password": "strongPass123"
}
```

Success: `200` with `data` user payload.

### POST /api/auth/logout

Clears auth cookies. When CSRF token/header is present, it is validated before logout.

Note: frontend behavior is to redirect to `/login` after logout.

### GET /api/auth/me

Returns currently authenticated user from session cookie.

## OAuth 2.0 API

Base path: `/api/auth`

Implemented providers:

- `github`
- `google`
- `42`

### GET /api/auth/oauth/providers

Returns enabled OAuth providers.

Success: `200`

```json
{
  "success": true,
  "data": ["42", "github", "google"]
}
```

### GET /api/auth/oauth/:provider

Starts OAuth authorization flow for the provider.

Behavior:

- creates and stores short-lived `oauth_state` cookie
- redirects (`302`) to provider authorization URL

### GET /api/auth/oauth/:provider/callback

Handles provider callback.

Behavior:

- validates `state` query against `oauth_state` cookie
- rejects provider-denied callbacks before token exchange
- resolves local user by linked account or verified email
- creates local account if safe and needed
- sets `auth_token` and `csrf_token` cookies
- redirects to success or error URL

Error redirect codes (to `OAUTH_ERROR_REDIRECT?code=...`):

- `oauth_provider_denied`
- `oauth_state_missing`
- `oauth_state_invalid`
- `oauth_profile_invalid`
- `oauth_account_conflict`
- `oauth_callback_invalid`
- `oauth_access_token_failed`
- `oauth_redirect_uri_mismatch`
- `oauth_user_not_found`
- `oauth_provider_unavailable`

## OAuth Evaluator Evidence

Use these checks for the OAuth minor module validation.

1. Verify providers endpoint:

```bash
curl -k -i https://localhost:8443/api/auth/oauth/providers
```

2. Verify provider start redirect:

```bash
curl -k -i -c /tmp/oauth.cookies https://localhost:8443/api/auth/oauth/github
```

3. Denied consent should redirect to `code=oauth_provider_denied`.
4. Tampered callback state should redirect to `code=oauth_state_invalid`.
5. Reused callback state should redirect to `code=oauth_state_missing`.
6. Existing verified-email account should be linked (no duplicate user).

Automated coverage is included in:

- `scripts/test-backend-flow.sh`

Run:

```bash
npm run test:backend
```

## Users API

Base path: `/api/users`

### GET /api/users/leaderboard

Returns up to 50 users ranked by total likes on non-removed articles. Each row includes username, avatar, article count, total likes, level, and earned badges.

### PATCH /api/users/me

Edits authenticated user profile.

Request body fields:

- `displayName` (optional): string or `null`, max 20 chars
- `bio` (optional): string or `null`, max 500 chars

Success: `200` with updated editable profile payload.

### POST /api/users/me/avatar

Uploads authenticated user avatar.

Rules:

- Multipart field name: `avatar`
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- Max size: 2MB
- Stored as UUID filename under `/uploads`
- Replaces `avatarUrl` and removes previous local avatar file (if present)

Success: `200` with updated editable profile payload.

Validation errors:

- `400` invalid/missing file
- `413` file too large

### DELETE /api/users/me/avatar

Deletes authenticated user's avatar.

Success: `200` with updated editable profile payload (`avatarUrl: null`).

### DELETE /api/users/me

Permanently deletes the authenticated user's account. The request must include the `x-csrf-token` header matching the `csrf_token` cookie.

Account deletion cascades through the user's articles, comments, likes, follows, friendships, messages, notifications, badges, and OAuth accounts. The user's local avatar file is also removed when present. Auth cookies are cleared after successful deletion.

### GET /api/users/:username

Returns the public profile of a user by username.

Public payload includes:

- `displayName`
- `username`
- `avatarUrl`
- `bio`
- `followerCount`
- `followingCount`
- `articleCount`
- `badges`
- `level`
- `xp`

Validation and error behavior:

- `400` invalid username format
- `404` user not found

## Articles API

Base path: `/api/articles`

**Status:** Implemented (feed, detail, create, update, delete, comments, likes)

### GET /api/articles

Returns paginated articles with filtering, searching, and sorting. **Public route** (no auth required).

Query Parameters:

- `page` (optional): number, default `1`
- `limit` (optional): number, default `20`, max `100`
- `category` (optional): one of `PROGRAMMING`, `CAREER`, `STUDY_NOTES`, `PROJECTS`, `LIFE`, `OPINION`
- `sort` (optional): one of `newest`, `oldest`, `most_liked`, default `newest`
- `search` (optional): search in article title and content (case-insensitive)

Success: `200` with paginated articles

```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": "uuid",
        "title": "Article Title",
        "content": "Article content...",
        "category": "PROGRAMMING",
        "likeCount": 10,
        "createdAt": "2026-06-30T...",
        "updatedAt": "2026-06-30T...",
        "author": {
          "id": "uuid",
          "username": "author_username",
          "displayName": "Author Display Name",
          "avatarUrl": "/uploads/..."
        },
        "_count": {
          "comments": 5
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

Validation errors:

- `400` invalid query parameters (e.g., invalid sort value)

Examples:

```bash
# Get latest articles
curl -k https://localhost:8443/api/articles

# Get programming articles, sorted by most liked
curl -k 'https://localhost:8443/api/articles?category=PROGRAMMING&sort=most_liked'

# Search articles
curl -k 'https://localhost:8443/api/articles?search=typescript'

# Paginate with custom limit
curl -k 'https://localhost:8443/api/articles?page=2&limit=10'
```

### GET /api/articles/:id

Returns one article with full content, author info, comment count, and current-user like state (when authenticated).

### POST /api/articles

Creates a new article for authenticated users.

### PATCH /api/articles/:id

Updates title/content/category. Author-only.

### DELETE /api/articles/:id

Deletes an article. Author-only.

### GET /api/articles/:id/comments

Returns comments ordered oldest-first.

### POST /api/articles/:id/comments

Adds a comment to an article. Auth required.

### POST /api/articles/:id/like

Toggles like/unlike for the current user. Auth required.

### PATCH /api/comments/:id

Updates a comment. Author-only.

### DELETE /api/comments/:id

Author hard-deletes their own comment; moderator/admin can soft-remove with reason.

## Social API

### Friends (`/api/friends`)

- `GET /requests`
- `GET /`
- `GET /status/:userId`
- `POST /request/:userId`
- `PATCH /request/:userId`
- `DELETE /request/:userId`
- `DELETE /:userId`

### CV (`/api/users/me/cv`)

- `POST /` — upload or replace the authenticated user's CV (`.txt`, `.pdf`, `.doc`, `.docx`; max 5MB)
- `DELETE /` — remove the authenticated user's CV and stored file

Public profile responses include `cvUrl` and `cvFilename` when a CV is available for download.

### Follows (`/api/follows`)

- `GET /status/:userId`
- `POST /:userId`
- `DELETE /:userId`

### Messages (`/api/messages`)

- `GET /:userId`
- `POST /:userId`

### Notifications (`/api/notifications`)

- `GET /`
- `PATCH /read-all`
- `PATCH /:id/read`

## Admin API

Base path: `/api/admin`

All admin routes require authentication and the appropriate `ADMIN` or `MODERATOR` role.

- `GET /users` — list users; admin only
- `PATCH /users/:id/role` — change a user's role; admin only
- `GET /articles` — list articles for moderation; moderator/admin
- `PATCH /articles/:id/remove` — soft-remove an article; moderator/admin
- `PATCH /comments/:id/remove` — soft-remove a comment; moderator/admin

## Test Flow Script

The backend integration flow script lives in:

- `scripts/test-backend-flow.sh`
- `scripts/test-follows-flow.sh`
- `scripts/test-friends-flow.sh`
- `scripts/test-messages.sh`
- `scripts/test-gamification-flow.sh`
- `scripts/test-realtime-flow.sh`

Run it with:

```bash
npm run test:backend
```

Run the Socket.IO realtime tests from the repository root:

```bash
make test-realtime
```

Current flow also checks:

- profile update success and validation cases
- public profile read (`GET /api/users/:username`)
- avatar upload, replace, delete, and unauthenticated access
- articles feed with pagination, filtering, and sorting

## Error Response Shape

```json
{
  "success": false,
  "error": "Error message"
}
```

Note: some social controllers still return legacy shape:

```json
{
  "data": {},
  "error": null
}
```

The backend is gradually being standardized to the `success/data/error` envelope.

## Quick cURL Examples

Register:

```bash
curl -k -X POST https://localhost:8443/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new.user@example.com","username":"new_user","password":"strongPass123"}'
```

Login (save cookies):

```bash
curl -k -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"new.user@example.com","password":"strongPass123"}' \
  -c cookies.txt
```

Me (send cookies):

```bash
curl -k https://localhost:8443/api/auth/me -b cookies.txt
```
