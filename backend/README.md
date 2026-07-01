# Backend

Express + TypeScript API for ft_transcendence.

## What This Service Does

### Completed ✓
- **User authentication** (`register`, `login`, `logout`, `me`)
- **Public profile read** (`GET /api/users/:username`) — displayName, bio, stats
- **User profile updates** (`PATCH /api/users/me`) — displayName, bio with validation
- **Avatar management** (`POST /api/users/me/avatar`) — upload PNG/JPG, max 2MB
- **Avatar delete** (`DELETE /api/users/me/avatar`) — remove user avatar
- Cookie-based auth session with JWT and CSRF token checks
- Prisma integration for PostgreSQL
- Centralized error handling with typed API responses

### In Progress
- **Global articles feed** (`GET /api/articles`) — paginated, searchable, filterable, sortable

## Run Modes

### A) Recommended: via root Docker setup

From repository root:

```bash
make up
```

Backend is available through Nginx at:

- https://localhost:8443/api

### B) Local backend-only development

From `backend/`:

```bash
npm install
npm run dev
```

Default local URL:

- http://localhost:3000

## Environment Variables

| Name           | Description                           | Example                                                                |
|----------------|---------------------------------------|------------------------------------------------------------------------|
| `NODE_ENV`     | runtime mode                          | `development`                                                          |
| `PORT`         | backend port inside container/process | `3000`                                                                 |
| `DATABASE_URL` | prisma postgres connection string     | `postgresql://transcendence:transcendence@postgres:5432/transcendence` |
| `JWT_SECRET`   | secret for signing auth tokens        | `long-random-value`                                                    |
| `UPLOAD_PATH`  | file upload path                      | `./uploads`                                                            |

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
- `password`: 8-72 chars

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

### GET /api/auth/me

Returns currently authenticated user from session cookie.

## Users API

Base path: `/api/users`

### PATCH /api/users/me

Edits authenticated user profile.

Request body fields:

- `displayName` (optional): string or `null`, max 50 chars
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

**Status:** In Progress - GET endpoint complete, POST/PUT/DELETE coming soon

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
curl http://localhost:3000/api/articles

# Get programming articles, sorted by most liked
curl 'http://localhost:3000/api/articles?category=PROGRAMMING&sort=most_liked'

# Search articles
curl 'http://localhost:3000/api/articles?search=typescript'

# Paginate with custom limit
curl 'http://localhost:3000/api/articles?page=2&limit=10'
```

## Test Flow Script

The backend integration flow script lives in:

- `scripts/test-backend-flow.sh`

Run it with:

```bash
npm run test:backend
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

## Quick cURL Examples

Register:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new.user@example.com","username":"new_user","password":"strongPass123"}'
```

Login (save cookies):

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"new.user@example.com","password":"strongPass123"}' \
  -c cookies.txt
```

Me (send cookies):

```bash
curl http://localhost:3000/api/auth/me -b cookies.txt
```
